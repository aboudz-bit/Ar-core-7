import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, isSuperAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { queueImageTo3DJob, getImageTo3DConfig } from '@/lib/image-to-3d';

export const dynamic = 'force-dynamic';

/**
 * POST /api/generate-3d
 * Trigger image-to-3D generation for a product.
 * Body: { productId: string, assetId?: string }
 *
 * If assetId is not provided, uses the first IMAGE_2D asset of the product.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const config = getImageTo3DConfig();
  if (!config.enabled) {
    return NextResponse.json({
      success: false,
      error: 'Image-to-3D generation is not enabled. Set IMAGE_TO_3D_ENABLED=true in environment.',
    }, { status: 503 });
  }

  const { productId, assetId } = await req.json();

  if (!productId) {
    return NextResponse.json({ success: false, error: 'productId is required' }, { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { assets: true },
  });

  if (!product) {
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
  }

  if (!isSuperAdmin(session) && !session.memberships.some((m) => m.companyId === product.companyId)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  // Check if product already has a 3D model
  const existingModel = product.assets.find((a) => a.assetType === 'MODEL_GLB');
  if (existingModel) {
    return NextResponse.json({
      success: false,
      error: 'Product already has a 3D model. Delete it first to regenerate.',
    }, { status: 409 });
  }

  // Find source image
  let sourceAsset;
  if (assetId) {
    sourceAsset = product.assets.find((a) => a.id === assetId);
  } else {
    sourceAsset = product.assets.find((a) => a.assetType === 'IMAGE_2D') ||
                  product.assets.find((a) => a.assetType === 'THUMBNAIL');
  }

  if (!sourceAsset) {
    return NextResponse.json({
      success: false,
      error: 'No image found for this product. Upload a product image first.',
    }, { status: 400 });
  }

  try {
    const jobId = await queueImageTo3DJob(
      product.id,
      product.companyId,
      sourceAsset.id,
      sourceAsset.filePath
    );

    await logAudit({
      userId: session.userId,
      companyId: product.companyId,
      action: 'GENERATE_3D',
      entity: 'Product',
      entityId: product.id,
      details: { sourceAssetId: sourceAsset.id, provider: config.provider },
    });

    return NextResponse.json({
      success: true,
      data: {
        jobId,
        status: 'pending',
        productId: product.id,
        provider: config.provider,
      },
    }, { status: 202 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * GET /api/generate-3d?productId=xxx
 * List generation jobs for a product.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get('productId');

  if (!productId) {
    return NextResponse.json({ success: false, error: 'productId is required' }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });

  if (!isSuperAdmin(session) && !session.memberships.some((m) => m.companyId === product.companyId)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const jobs = await prisma.imageTo3DJob.findMany({
    where: { productId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return NextResponse.json({ success: true, data: jobs });
}

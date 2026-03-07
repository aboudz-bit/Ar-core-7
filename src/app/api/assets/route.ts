import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, isSuperAdmin } from '@/lib/auth';
import { saveFile, validateFileSize, resolveAssetType, isAllowedExtension, buildProductPath } from '@/lib/storage';
import { logAudit } from '@/lib/audit';
import { calculateCompletenessScore } from '@/lib/utils';
import { queueModelOptimization } from '@/lib/model-pipeline';
import { dispatchWebhook } from '@/lib/webhooks';

export const dynamic = 'force-dynamic';

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

  const assets = await prisma.productAsset.findMany({
    where: { productId },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ success: true, data: assets });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const productId = formData.get('productId') as string;
  const assetType = formData.get('assetType') as string | null;

  if (!file || !productId) {
    return NextResponse.json({ success: false, error: 'File and productId are required' }, { status: 400 });
  }

  // Validate file extension
  if (!isAllowedExtension(file.name)) {
    return NextResponse.json({
      success: false,
      error: `File type not allowed. Supported: GLB, GLTF, USDZ, JPG, PNG, WebP, SVG`,
    }, { status: 400 });
  }

  // Validate file size
  if (!validateFileSize(file.size)) {
    const maxMb = process.env.MAX_UPLOAD_SIZE_MB || '50';
    return NextResponse.json({
      success: false,
      error: `File too large. Maximum size is ${maxMb}MB`,
    }, { status: 413 });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, companyId: true },
  });
  if (!product) return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });

  if (!isSuperAdmin(session) && !session.memberships.some((m) => m.companyId === product.companyId)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const resolvedType = resolveAssetType(file.name, file.type, assetType);

  const buffer = Buffer.from(await file.arrayBuffer());
  const subDir = buildProductPath(product.companyId, product.id);
  const filePath = await saveFile(buffer, file.name, subDir);

  const asset = await prisma.productAsset.create({
    data: {
      productId,
      assetType: resolvedType as never,
      fileName: file.name,
      filePath,
      fileSize: file.size,
      mimeType: file.type,
    },
  });

  // If this is a THUMBNAIL type, also update the product thumbnailUrl
  if (resolvedType === 'THUMBNAIL') {
    await prisma.product.update({
      where: { id: productId },
      data: { thumbnailUrl: filePath },
    });
  }

  // Update completeness score
  const allAssets = await prisma.productAsset.findMany({
    where: { productId },
    select: { assetType: true },
  });
  const score = calculateCompletenessScore(allAssets);
  await prisma.product.update({
    where: { id: productId },
    data: { assetCompletenessScore: score },
  });

  await logAudit({
    userId: session.userId,
    companyId: product.companyId,
    action: 'UPLOAD',
    entity: 'ProductAsset',
    entityId: asset.id,
    details: { fileName: file.name, assetType: resolvedType, fileSize: file.size },
  });

  // Queue model optimization for 3D model uploads
  if (['MODEL_GLB', 'MODEL_GLTF', 'MODEL_USDZ'].includes(resolvedType)) {
    queueModelOptimization(asset.id, productId, product.companyId, filePath).catch((err) => {
      console.error('Model optimization queue failed:', err);
    });
  }

  // Dispatch webhook for asset upload
  dispatchWebhook(product.companyId, 'asset_uploaded', {
    assetId: asset.id,
    productId,
    fileName: file.name,
    assetType: resolvedType,
    fileSize: file.size,
  }).catch(() => {});

  return NextResponse.json({ success: true, data: asset }, { status: 201 });
}

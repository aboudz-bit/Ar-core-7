import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, isSuperAdmin } from '@/lib/auth';
import { saveFile, validateFileSize } from '@/lib/storage';
import { logAudit } from '@/lib/audit';
import { calculateCompletenessScore } from '@/lib/utils';

const ASSET_TYPE_MAP: Record<string, string> = {
  'model/gltf-binary': 'MODEL_GLB',
  'application/octet-stream': 'MODEL_GLB',
  'model/gltf+json': 'MODEL_GLTF',
  'image/jpeg': 'IMAGE_2D',
  'image/png': 'IMAGE_2D',
  'image/webp': 'IMAGE_2D',
};

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

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });

  if (!isSuperAdmin(session) && !session.memberships.some((m) => m.companyId === product.companyId)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  if (!validateFileSize(file.size)) {
    return NextResponse.json({ success: false, error: 'File too large' }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = await saveFile(buffer, file.name, `products/${productId}`);

  const resolvedType = assetType || ASSET_TYPE_MAP[file.type] || 'IMAGE_2D';

  const asset = await prisma.productAsset.create({
    data: {
      productId,
      assetType: resolvedType as 'IMAGE_2D' | 'MODEL_GLB' | 'MODEL_GLTF' | 'MODEL_USDZ' | 'POSTER' | 'TARGET_IMAGE' | 'FACE_EFFECT' | 'THUMBNAIL',
      fileName: file.name,
      filePath,
      fileSize: file.size,
      mimeType: file.type,
    },
  });

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
    details: { fileName: file.name, assetType: resolvedType },
  });

  return NextResponse.json({ success: true, data: asset }, { status: 201 });
}

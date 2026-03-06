import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, isSuperAdmin } from '@/lib/auth';
import { deleteFile, saveFile, validateFileSize, resolveAssetType, buildProductPath } from '@/lib/storage';
import { logAudit } from '@/lib/audit';
import { calculateCompletenessScore } from '@/lib/utils';

async function getAssetWithAuth(assetId: string) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized', status: 401, session: null, asset: null, product: null };

  const asset = await prisma.productAsset.findUnique({
    where: { id: assetId },
    include: { product: { select: { id: true, companyId: true } } },
  });

  if (!asset) return { error: 'Asset not found', status: 404, session, asset: null, product: null };

  if (!isSuperAdmin(session) && !session.memberships.some((m) => m.companyId === asset.product.companyId)) {
    return { error: 'Forbidden', status: 403, session, asset: null, product: null };
  }

  return { error: null, status: 200, session, asset, product: asset.product };
}

async function updateCompletenessScore(productId: string) {
  const allAssets = await prisma.productAsset.findMany({
    where: { productId },
    select: { assetType: true },
  });
  const score = calculateCompletenessScore(allAssets);
  await prisma.product.update({
    where: { id: productId },
    data: { assetCompletenessScore: score },
  });
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error, status, asset } = await getAssetWithAuth(params.id);
  if (error) return NextResponse.json({ success: false, error }, { status });

  return NextResponse.json({ success: true, data: asset });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, status, session, asset, product } = await getAssetWithAuth(params.id);
  if (error || !session || !asset || !product) {
    return NextResponse.json({ success: false, error: error || 'Error' }, { status });
  }

  const contentType = req.headers.get('content-type') || '';

  // If multipart form data, this is a file replacement
  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'File is required for replacement' }, { status: 400 });
    }

    if (!validateFileSize(file.size)) {
      return NextResponse.json({ success: false, error: 'File too large' }, { status: 413 });
    }

    // Delete old file
    await deleteFile(asset.filePath);

    // Save new file
    const buffer = Buffer.from(await file.arrayBuffer());
    const subDir = buildProductPath(product.companyId, product.id);
    const filePath = await saveFile(buffer, file.name, subDir);
    const assetType = resolveAssetType(file.name, file.type, formData.get('assetType') as string | null);

    const updated = await prisma.productAsset.update({
      where: { id: params.id },
      data: {
        fileName: file.name,
        filePath,
        fileSize: file.size,
        mimeType: file.type,
        assetType: assetType as never,
      },
    });

    await updateCompletenessScore(product.id);

    await logAudit({
      userId: session.userId,
      companyId: product.companyId,
      action: 'REPLACE',
      entity: 'ProductAsset',
      entityId: asset.id,
      details: { oldFile: asset.fileName, newFile: file.name, assetType },
    });

    return NextResponse.json({ success: true, data: updated });
  }

  // JSON body: update metadata (assetType, etc.)
  const body = await req.json();
  const allowedFields = ['assetType', 'metadata'];
  const updateData: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) {
      updateData[key] = body[key];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 });
  }

  const updated = await prisma.productAsset.update({
    where: { id: params.id },
    data: updateData as never,
  });

  await updateCompletenessScore(product.id);

  await logAudit({
    userId: session.userId,
    companyId: product.companyId,
    action: 'UPDATE',
    entity: 'ProductAsset',
    entityId: asset.id,
    details: updateData,
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error, status, session, asset, product } = await getAssetWithAuth(params.id);
  if (error || !session || !asset || !product) {
    return NextResponse.json({ success: false, error: error || 'Error' }, { status });
  }

  // Delete file from disk
  await deleteFile(asset.filePath);

  // Delete record
  await prisma.productAsset.delete({ where: { id: params.id } });

  // If this was the thumbnail, clear the product thumbnailUrl
  if (asset.assetType === 'THUMBNAIL') {
    await prisma.product.update({
      where: { id: product.id },
      data: { thumbnailUrl: null },
    });
  }

  await updateCompletenessScore(product.id);

  await logAudit({
    userId: session.userId,
    companyId: product.companyId,
    action: 'DELETE',
    entity: 'ProductAsset',
    entityId: asset.id,
    details: { fileName: asset.fileName, assetType: asset.assetType },
  });

  return NextResponse.json({ success: true });
}

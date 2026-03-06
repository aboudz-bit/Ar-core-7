import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiKey, checkRateLimit } from '@/lib/api-auth';
import { formatAssetResponse } from '@/lib/api-v1';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { context, error } = await requireApiKey(req);
  if (error) return error;

  const rateLimitError = await checkRateLimit(context.apiKeyId);
  if (rateLimitError) return rateLimitError;

  const product = await prisma.product.findFirst({
    where: { id: params.id, companyId: context.companyId },
    select: { id: true },
  });

  if (!product) {
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
  }

  const assets = await prisma.productAsset.findMany({
    where: { productId: params.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    success: true,
    data: assets.map(formatAssetResponse),
  });
}

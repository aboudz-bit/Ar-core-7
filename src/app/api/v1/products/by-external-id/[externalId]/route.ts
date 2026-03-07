import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiKey, checkRateLimit } from '@/lib/api-auth';
import { formatProductResponse } from '@/lib/api-v1';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { externalId: string } }) {
  const { context, error } = await requireApiKey(req);
  if (error) return error;

  const rateLimitError = await checkRateLimit(context.apiKeyId);
  if (rateLimitError) return rateLimitError;

  const product = await prisma.product.findFirst({
    where: {
      companyId: context.companyId,
      externalId: decodeURIComponent(params.externalId),
      status: 'ACTIVE',
    },
    include: {
      company: { select: { id: true, name: true, slug: true, brandPrimary: true, logoUrl: true } },
      assets: { select: { assetType: true, filePath: true, fileName: true, fileSize: true } },
      experiences: {
        where: { publishStatus: 'PUBLISHED' },
        select: { id: true, name: true, slug: true, experienceType: true, publishStatus: true },
      },
    },
  });

  if (!product) {
    return NextResponse.json({ success: false, error: 'Product not found for this external ID' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: formatProductResponse(product as Parameters<typeof formatProductResponse>[0]),
  });
}

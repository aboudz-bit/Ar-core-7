import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiKey, checkRateLimit } from '@/lib/api-auth';
import { formatExperienceResponse } from '@/lib/api-v1';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { context, error } = await requireApiKey(req);
  if (error) return error;

  const rateLimitError = checkRateLimit(context.apiKeyId);
  if (rateLimitError) return rateLimitError;

  const product = await prisma.product.findFirst({
    where: { id: params.id, companyId: context.companyId },
    select: { id: true },
  });

  if (!product) {
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
  }

  const experiences = await prisma.experience.findMany({
    where: { productId: params.id, publishStatus: 'PUBLISHED' },
    include: {
      company: { select: { id: true, name: true, slug: true, brandPrimary: true, logoUrl: true } },
      product: {
        select: { id: true, title: true, assets: { select: { assetType: true, filePath: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    success: true,
    data: experiences.map((e) => formatExperienceResponse(e as Parameters<typeof formatExperienceResponse>[0])),
  });
}

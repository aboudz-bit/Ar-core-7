import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiKey, checkRateLimit } from '@/lib/api-auth';
import { formatProductResponse } from '@/lib/api-v1';

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const { context, error } = await requireApiKey(req);
  if (error) return error;

  const rateLimitError = checkRateLimit(context.apiKeyId);
  if (rateLimitError) return rateLimitError;

  const products = await prisma.product.findMany({
    where: { companyId: context.companyId, status: 'ACTIVE' },
    include: {
      company: { select: { id: true, name: true, slug: true, brandPrimary: true, logoUrl: true } },
      assets: { select: { assetType: true, filePath: true, fileName: true, fileSize: true } },
      experiences: {
        where: { publishStatus: 'PUBLISHED' },
        select: { id: true, name: true, slug: true, experienceType: true, publishStatus: true },
      },
    },
  });

  const product = products.find((p) => {
    const slug = p.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return slug === params.slug;
  });

  if (!product) {
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: formatProductResponse(product as Parameters<typeof formatProductResponse>[0]),
  });
}

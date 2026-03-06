import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiKey, checkRateLimit } from '@/lib/api-auth';
import { formatExperienceResponse } from '@/lib/api-v1';

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const { context, error } = await requireApiKey(req);
  if (error) return error;

  const rateLimitError = await checkRateLimit(context.apiKeyId);
  if (rateLimitError) return rateLimitError;

  // Find product by slug
  const products = await prisma.product.findMany({
    where: { companyId: context.companyId, status: 'ACTIVE' },
    select: { id: true, title: true },
  });

  const product = products.find((p) => {
    const slug = p.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return slug === params.slug;
  });

  if (!product) {
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
  }

  // Find first published AR experience for this product
  const experience = await prisma.experience.findFirst({
    where: {
      productId: product.id,
      companyId: context.companyId,
      publishStatus: 'PUBLISHED',
      experienceType: { in: ['PRODUCT_VIEWER', 'SURFACE_AR'] },
    },
    include: {
      company: { select: { id: true, name: true, slug: true, brandPrimary: true, logoUrl: true } },
      product: {
        select: { id: true, title: true, assets: { select: { assetType: true, filePath: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!experience) {
    return NextResponse.json({
      success: false,
      error: 'No published AR experience found for this product',
    }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return NextResponse.json({
    success: true,
    data: {
      ...formatExperienceResponse(experience as Parameters<typeof formatExperienceResponse>[0]),
      launchUrl: `${appUrl}/launch/${experience.slug}`,
      embedUrl: `${appUrl}/embed/${experience.slug}`,
    },
  });
}

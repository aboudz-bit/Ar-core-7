import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const slug = params.slug;

  // Find product by generating slug from title, or by matching experience slug
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    include: {
      company: { select: { id: true, name: true, slug: true } },
      assets: { select: { assetType: true, filePath: true, fileName: true } },
      experiences: {
        where: { publishStatus: 'PUBLISHED' },
        select: { id: true, slug: true, experienceType: true },
        take: 1,
      },
    },
  });

  const product = products.find((p) => {
    const productSlug = p.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (productSlug === slug) return true;
    return p.experiences.some((e) => e.slug === slug);
  });

  if (!product) {
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const glbAsset = product.assets.find((a) => a.assetType === 'MODEL_GLB');
  const posterAsset = product.assets.find((a) => a.assetType === 'POSTER');

  return NextResponse.json({
    name: product.title,
    model: glbAsset ? `${appUrl}${glbAsset.filePath}` : null,
    poster: posterAsset ? `${appUrl}${posterAsset.filePath}` : null,
    tracking: 'surface',
    description: product.description,
    company: product.company.name,
    scale: product.scalePreset,
    slug: product.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    experienceSlug: product.experiences[0]?.slug || null,
  });
}

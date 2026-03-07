import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const slug = params.slug;

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

  const glbAsset = product.assets.find((a) => a.assetType === 'MODEL_GLB');
  const usdzAsset = product.assets.find((a) => a.assetType === 'MODEL_USDZ');
  const posterAsset = product.assets.find((a) => a.assetType === 'POSTER');
  const thumbnailAsset = product.assets.find((a) => a.assetType === 'THUMBNAIL');
  const imageAsset = product.assets.find((a) => a.assetType === 'IMAGE_2D');

  const fallbackImage = posterAsset?.filePath
    || thumbnailAsset?.filePath
    || imageAsset?.filePath
    || product.thumbnailUrl
    || null;

  return NextResponse.json({
    name: product.title,
    model: glbAsset ? glbAsset.filePath : null,
    modelUsdz: usdzAsset ? usdzAsset.filePath : null,
    poster: posterAsset ? posterAsset.filePath : null,
    image: fallbackImage,
    hasModel: !!glbAsset || !!usdzAsset,
    hasImage: !!fallbackImage,
    tracking: 'surface',
    description: product.description,
    company: product.company.name,
    scale: product.scalePreset,
    slug: product.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    experienceSlug: product.experiences[0]?.slug || null,
  });
}

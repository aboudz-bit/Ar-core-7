import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  // Find product by slug-style title match
  const products = await prisma.product.findMany({
    where: { status: { in: ['ACTIVE', 'AR_READY', 'IMAGE_ONLY'] } },
    include: {
      company: { select: { id: true, name: true, slug: true, brandPrimary: true, logoUrl: true } },
      assets: { select: { assetType: true, filePath: true, fileName: true, fileSize: true } },
      experiences: {
        where: { publishStatus: 'PUBLISHED' },
        select: { id: true, name: true, slug: true, experienceType: true },
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const glbAsset = product.assets.find((a) => a.assetType === 'MODEL_GLB');
  const usdzAsset = product.assets.find((a) => a.assetType === 'MODEL_USDZ');
  const posterAsset = product.assets.find((a) => a.assetType === 'POSTER');
  const productSlug = product.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  return NextResponse.json({
    success: true,
    data: {
      id: product.id,
      title: product.title,
      description: product.description,
      company: product.company,
      assets: {
        modelUrl: glbAsset ? `${appUrl}${glbAsset.filePath}` : null,
        usdzUrl: usdzAsset ? `${appUrl}${usdzAsset.filePath}` : null,
        posterUrl: posterAsset ? `${appUrl}${posterAsset.filePath}` : null,
        all: product.assets.map((a) => ({
          type: a.assetType,
          url: `${appUrl}${a.filePath}`,
          fileName: a.fileName,
          fileSize: a.fileSize,
        })),
      },
      urls: {
        arViewer: `${appUrl}/product/${productSlug}/ar`,
        viewer: `${appUrl}/viewer/${product.company.slug}/${productSlug}`,
      },
      experiences: product.experiences.map((exp) => ({
        id: exp.id,
        name: exp.name,
        type: exp.experienceType,
        urls: {
          viewer: `${appUrl}/ar/${exp.slug}`,
          embed: `${appUrl}/embed/${exp.slug}`,
          launch: `${appUrl}/launch/${exp.slug}`,
        },
      })),
    },
  });
}

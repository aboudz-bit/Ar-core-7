import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const experience = await prisma.experience.findUnique({
    where: { slug: params.slug },
    include: {
      company: { select: { id: true, name: true, slug: true, brandPrimary: true, logoUrl: true } },
      product: {
        select: {
          id: true,
          title: true,
          description: true,
          assets: { select: { assetType: true, filePath: true } },
        },
      },
    },
  });

  if (!experience || experience.publishStatus !== 'PUBLISHED') {
    return NextResponse.json({ success: false, error: 'Not found or not published' }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const glbAsset = experience.product?.assets.find((a) => a.assetType === 'MODEL_GLB');
  const usdzAsset = experience.product?.assets.find((a) => a.assetType === 'MODEL_USDZ');
  const posterAsset = experience.product?.assets.find((a) => a.assetType === 'POSTER');

  return NextResponse.json({
    success: true,
    data: {
      id: experience.id,
      name: experience.name,
      slug: experience.slug,
      type: experience.experienceType,
      company: experience.company,
      product: experience.product ? {
        id: experience.product.id,
        title: experience.product.title,
        description: experience.product.description,
      } : null,
      assets: {
        modelUrl: glbAsset ? glbAsset.filePath : null,
        usdzUrl: usdzAsset ? usdzAsset.filePath : null,
        posterUrl: posterAsset ? posterAsset.filePath : null,
      },
      urls: {
        viewer: `${appUrl}/ar/${experience.slug}`,
        embed: `${appUrl}/embed/${experience.slug}`,
        launch: `${appUrl}/launch/${experience.slug}`,
        qr: `${appUrl}/qr/${experience.slug}`,
        ...(experience.experienceType === 'FACE_TRYON' || experience.experienceType === 'BODY_TRYON'
          ? { tryon: `${appUrl}/tryon/${experience.slug}` }
          : {}),
      },
      embed: {
        iframe: `<iframe src="${appUrl}/embed/${experience.slug}" style="width:100%;height:600px;border:0;" allow="camera; xr-spatial-tracking" allowfullscreen></iframe>`,
      },
    },
  });
}

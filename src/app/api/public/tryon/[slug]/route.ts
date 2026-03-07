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
          category: true,
          thumbnailUrl: true,
          assets: { select: { id: true, assetType: true, filePath: true, fileName: true, metadata: true } },
        },
      },
    },
  });

  if (!experience || experience.publishStatus !== 'PUBLISHED') {
    return NextResponse.json({ success: false, error: 'Not found or not published' }, { status: 404 });
  }

  if (experience.experienceType !== 'FACE_TRYON' && experience.experienceType !== 'BODY_TRYON') {
    return NextResponse.json({ success: false, error: 'Not a try-on experience' }, { status: 400 });
  }

  // Filter overlay assets based on experience type
  const overlayTypes = experience.experienceType === 'FACE_TRYON'
    ? ['FACE_OVERLAY_MODEL', 'FACE_OVERLAY_IMAGE', 'FACE_EFFECT']
    : ['BODY_OVERLAY_MODEL', 'BODY_REFERENCE_IMAGE'];

  const overlays = (experience.product?.assets || [])
    .filter((a) => overlayTypes.includes(a.assetType))
    .map((a) => ({
      id: a.id,
      assetType: a.assetType,
      filePath: a.filePath,
      fileName: a.fileName,
      metadata: a.metadata,
    }));

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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
        category: experience.product.category,
        thumbnailUrl: experience.product.thumbnailUrl,
      } : null,
      overlays,
      urls: {
        tryon: `${appUrl}/tryon/${experience.slug}`,
        embed: `${appUrl}/embed/${experience.slug}`,
      },
    },
  });
}

import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { ArExperienceClient } from './ArExperienceClient';

interface Props {
  params: { experienceSlug: string };
}

export default async function ArExperiencePage({ params }: Props) {
  const experience = await prisma.experience.findUnique({
    where: { slug: params.experienceSlug },
    include: {
      company: true,
      product: { include: { assets: true } },
    },
  });

  if (!experience || experience.publishStatus !== 'PUBLISHED') {
    return notFound();
  }

  const glbAsset = experience.product?.assets.find((a) => a.assetType === 'MODEL_GLB');
  const usdzAsset = experience.product?.assets.find((a) => a.assetType === 'MODEL_USDZ');
  const posterAsset = experience.product?.assets.find((a) => a.assetType === 'POSTER');
  const targetAsset = experience.product?.assets.find((a) => a.assetType === 'TARGET_IMAGE');

  return (
    <ArExperienceClient
      experience={{
        id: experience.id,
        name: experience.name,
        slug: experience.slug,
        type: experience.experienceType,
        scale: experience.scale,
        lightingPreset: experience.lightingPreset,
        ctaText: experience.ctaText,
        ctaLink: experience.ctaLink,
      }}
      product={experience.product ? {
        id: experience.product.id,
        title: experience.product.title,
        modelUrl: glbAsset?.filePath || null,
        usdzUrl: usdzAsset?.filePath || null,
        posterUrl: posterAsset?.filePath || null,
        targetImageUrl: targetAsset?.filePath || null,
      } : null}
      company={{
        id: experience.company.id,
        name: experience.company.name,
        brandPrimary: experience.company.brandPrimary,
      }}
    />
  );
}

import { notFound } from 'next/navigation';
import { getViewerData } from '@/lib/viewer';
import { ArExperienceClient } from './ArExperienceClient';

interface Props {
  params: { experienceSlug: string };
}

export default async function ArExperiencePage({ params }: Props) {
  const data = await getViewerData(params.experienceSlug);
  if (!data) return notFound();

  return (
    <ArExperienceClient
      experience={{
        id: data.experience.id,
        name: data.experience.name,
        slug: data.experience.slug,
        type: data.experience.type,
        scale: data.experience.scale,
        lightingPreset: data.experience.lightingPreset,
        ctaText: data.experience.ctaText,
        ctaLink: data.experience.ctaLink,
      }}
      product={data.product ? {
        id: data.product.id,
        title: data.product.title,
        modelUrl: data.product.modelUrl,
        usdzUrl: data.product.usdzUrl,
        posterUrl: data.product.posterUrl,
        targetImageUrl: data.product.targetImageUrl,
        fallbackImageUrl: data.product.fallbackImageUrl,
        generationStatus: data.product.generationStatus,
      } : null}
      company={{
        id: data.company.id,
        name: data.company.name,
        brandPrimary: data.company.brandPrimary,
      }}
      branding={data.branding}
    />
  );
}

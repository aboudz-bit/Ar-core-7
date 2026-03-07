import { notFound } from 'next/navigation';
import { getTryOnData } from '@/lib/tryon';
import { VirtualFitClient } from '@/components/ar/tryon/VirtualFitClient';

interface Props {
  params: { experienceSlug: string };
}

export default async function VirtualFitPage({ params }: Props) {
  const data = await getTryOnData(params.experienceSlug);

  // Only allow CLOTHING_TRYON_PHOTO experiences on this route
  if (!data || data.experience.type !== 'CLOTHING_TRYON_PHOTO') return notFound();

  // Extract garment images from overlays
  const garmentOverlays = data.overlays
    .filter((o) => o.assetType === 'GARMENT_IMAGE')
    .map((o) => ({ id: o.id, filePath: o.filePath, fileName: o.fileName }));

  return (
    <VirtualFitClient
      experience={data.experience}
      product={data.product ? {
        id: data.product.id,
        title: data.product.title,
        description: data.product.description,
        thumbnailUrl: data.product.thumbnailUrl,
      } : null}
      company={{
        id: data.company.id,
        name: data.company.name,
        brandPrimary: data.company.brandPrimary,
        logoUrl: data.company.logoUrl,
      }}
      garmentOverlays={garmentOverlays}
      branding={{ hideBranding: data.branding.hideBranding }}
    />
  );
}

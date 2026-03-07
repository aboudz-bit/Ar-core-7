import { notFound } from 'next/navigation';
import { getTryOnData } from '@/lib/tryon';
import { BodyTrackingClient } from '@/components/ar/body/BodyTrackingClient';

interface Props {
  params: { experienceSlug: string };
}

export default async function BodyTrackingPage({ params }: Props) {
  const data = await getTryOnData(params.experienceSlug);

  // Only allow BODY_TRYON experiences on this route
  if (!data || data.experience.type !== 'BODY_TRYON') return notFound();

  return (
    <BodyTrackingClient
      experience={data.experience}
      product={data.product ? {
        id: data.product.id,
        title: data.product.title,
        description: data.product.description,
      } : null}
      company={{
        id: data.company.id,
        name: data.company.name,
        brandPrimary: data.company.brandPrimary,
        logoUrl: data.company.logoUrl,
      }}
      branding={{ hideBranding: data.branding.hideBranding }}
    />
  );
}

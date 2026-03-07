import { notFound } from 'next/navigation';
import { getTryOnData } from '@/lib/tryon';
import { TryOnClient } from '@/components/ar/tryon/TryOnClient';

interface Props {
  params: { experienceSlug: string };
}

export default async function TryOnPage({ params }: Props) {
  const data = await getTryOnData(params.experienceSlug);
  if (!data) return notFound();

  return (
    <TryOnClient
      experience={data.experience}
      product={data.product}
      company={{
        id: data.company.id,
        name: data.company.name,
        brandPrimary: data.company.brandPrimary,
        logoUrl: data.company.logoUrl,
      }}
      overlays={data.overlays}
      branding={data.branding}
    />
  );
}

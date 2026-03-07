import { notFound } from 'next/navigation';
import { getViewerData } from '@/lib/viewer';
import { EmbedViewer } from '@/components/viewer/EmbedViewer';
import type { Metadata, Viewport } from 'next';

interface Props {
  params: { experienceSlug: string };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getViewerData(params.experienceSlug);
  if (!data) return { title: 'Not Found' };
  return {
    title: `AR: ${data.product?.title || data.experience.name}`,
    description: `Launch AR experience for ${data.product?.title || data.experience.name}`,
  };
}

export default async function LaunchPage({ params }: Props) {
  const data = await getViewerData(params.experienceSlug);
  if (!data) return notFound();

  return (
    <EmbedViewer
      experience={data.experience}
      product={data.product}
      company={data.company}
      branding={data.branding}
      autoLaunchAR
    />
  );
}

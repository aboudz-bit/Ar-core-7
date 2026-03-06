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
    title: data.product?.title || data.experience.name,
    description: data.product?.description || `AR experience by ${data.company.name}`,
    openGraph: {
      title: data.product?.title || data.experience.name,
      description: data.product?.description || `View in 3D and AR`,
      ...(data.product?.posterUrl ? { images: [data.product.posterUrl] } : {}),
    },
  };
}

export default async function EmbedPage({ params }: Props) {
  const data = await getViewerData(params.experienceSlug);
  if (!data) return notFound();

  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, overflow: 'hidden', width: '100%', height: '100vh' }}>
        <EmbedViewer
          experience={data.experience}
          product={data.product}
          company={data.company}
          branding={data.branding}
          embed
        />
      </body>
    </html>
  );
}

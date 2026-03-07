import { notFound } from 'next/navigation';
import { getViewerDataByProductSlug } from '@/lib/viewer';
import { EmbedViewer } from '@/components/viewer/EmbedViewer';
import type { Metadata, Viewport } from 'next';

interface Props {
  params: { productSlug: string };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getViewerDataByProductSlug(params.productSlug);
  if (!data) return { title: 'Not Found' };
  return {
    title: `${data.product?.title || 'Product'} - AR View`,
    description: data.product?.description || `View this product in 3D and AR`,
    openGraph: {
      title: `${data.product?.title || 'Product'} - AR View`,
      description: data.product?.description || `View in 3D and AR`,
      ...(data.product?.posterUrl ? { images: [data.product.posterUrl] } : {}),
    },
  };
}

export default async function ProductArPage({ params }: Props) {
  const data = await getViewerDataByProductSlug(params.productSlug);
  if (!data) return notFound();

  return (
    <EmbedViewer
      experience={data.experience}
      product={data.product}
      company={data.company}
      branding={data.branding}
    />
  );
}

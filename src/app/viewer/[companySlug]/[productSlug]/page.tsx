import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { ProductViewerClient } from './ProductViewerClient';

interface Props {
  params: { companySlug: string; productSlug: string };
}

export default async function ProductViewerPage({ params }: Props) {
  const company = await prisma.company.findUnique({
    where: { slug: params.companySlug },
  });

  if (!company) return notFound();

  // Find product by matching slug-style title
  const products = await prisma.product.findMany({
    where: { companyId: company.id, status: { in: ['ACTIVE', 'AR_READY'] } },
    include: { assets: true },
  });

  const product = products.find((p) => {
    const slug = p.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return slug === params.productSlug;
  });

  if (!product) return notFound();

  const glbAsset = product.assets.find((a) => a.assetType === 'MODEL_GLB');
  const usdzAsset = product.assets.find((a) => a.assetType === 'MODEL_USDZ');
  const posterAsset = product.assets.find((a) => a.assetType === 'POSTER');

  return (
    <ProductViewerClient
      product={{
        id: product.id,
        title: product.title,
        description: product.description,
        modelUrl: glbAsset?.filePath || null,
        usdzUrl: usdzAsset?.filePath || null,
        posterUrl: posterAsset?.filePath || null,
        scalePreset: product.scalePreset,
      }}
      company={{
        id: company.id,
        name: company.name,
        brandPrimary: company.brandPrimary,
      }}
    />
  );
}

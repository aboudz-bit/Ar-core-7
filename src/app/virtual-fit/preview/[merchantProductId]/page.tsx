import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { VirtualFitClient } from '@/components/ar/tryon/VirtualFitClient';

interface Props {
  params: { merchantProductId: string };
}

/**
 * Preview route for merchant products.
 * Loads MerchantProduct data and renders VirtualFitClient with the
 * merchant's garment image pre-selected and specs pre-filled.
 */
export default async function MerchantProductPreviewPage({ params }: Props) {
  let product;
  try {
    // Prisma delegate may be undefined if client hasn't been regenerated after schema change
    if (!prisma.merchantProduct) {
      console.error('[MerchantPreview] prisma.merchantProduct is undefined — run `npx prisma generate` to update the Prisma client');
      return notFound();
    }
    product = await prisma.merchantProduct.findUnique({
      where: { id: params.merchantProductId },
      include: { company: true },
    });
  } catch (err) {
    console.error('[MerchantPreview] Failed to fetch merchant product:', err);
    return notFound();
  }

  if (!product || !product.isActive) return notFound();

  // Build a garment overlay from the merchant product's image
  const garmentOverlays = [
    {
      id: product.id,
      filePath: product.garmentImagePath,
      fileName: product.title,
    },
  ];

  // Build merchant specs to pre-fill in VirtualFitClient
  const merchantSpecs = {
    garmentCategory: product.category,
    fitType: product.fitType,
    drapeFactor: product.drapeFactor,
    sizingSystem: product.sizingSystem,
    sizeChart: product.sizeChart as Record<string, Record<string, number>> | null,
    garmentLength: product.garmentLength,
    sleeveLength: product.sleeveLength,
    shoulderSpec: product.shoulderSpec,
    chestSpec: product.chestSpec,
  };

  return (
    <VirtualFitClient
      experience={{
        id: `merchant-preview-${product.id}`,
        name: product.title,
        slug: `merchant-preview-${product.id}`,
        ctaText: null,
        ctaLink: null,
      }}
      product={{
        id: product.id,
        title: product.title,
        description: null,
        thumbnailUrl: product.thumbnailUrl,
      }}
      company={{
        id: product.company.id,
        name: product.company.name,
        brandPrimary: product.company.brandPrimary,
        logoUrl: product.company.logoUrl,
      }}
      garmentOverlays={garmentOverlays}
      branding={{ hideBranding: false }}
      merchantSpecs={merchantSpecs}
    />
  );
}

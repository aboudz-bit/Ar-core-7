import { prisma } from '@/lib/prisma';

export interface ViewerData {
  experience: {
    id: string;
    name: string;
    slug: string;
    type: string;
    scale: number;
    lightingPreset: string;
    backgroundMode: string;
    ctaText: string | null;
    ctaLink: string | null;
  };
  product: {
    id: string;
    title: string;
    description: string | null;
    modelUrl: string | null;
    usdzUrl: string | null;
    posterUrl: string | null;
    targetImageUrl: string | null;
    fallbackImageUrl: string | null;
    scalePreset: number;
  } | null;
  company: {
    id: string;
    name: string;
    slug: string;
    brandPrimary: string;
    brandSecondary: string;
    logoUrl: string | null;
  };
  branding: {
    hideBranding: boolean;
    viewerBackground: string;
    logoUrl: string | null;
  };
}

/**
 * Fetch all data needed to render a published experience viewer.
 * Returns null if the experience doesn't exist or isn't published.
 */
export async function getViewerData(experienceSlug: string): Promise<ViewerData | null> {
  const experience = await prisma.experience.findUnique({
    where: { slug: experienceSlug },
    include: {
      company: true,
      product: { include: { assets: true } },
    },
  });

  if (!experience || experience.publishStatus !== 'PUBLISHED') {
    return null;
  }

  const glbAsset = experience.product?.assets.find((a) => a.assetType === 'MODEL_GLB');
  const usdzAsset = experience.product?.assets.find((a) => a.assetType === 'MODEL_USDZ');
  const posterAsset = experience.product?.assets.find((a) => a.assetType === 'POSTER');
  const thumbnailAsset = experience.product?.assets.find((a) => a.assetType === 'THUMBNAIL');
  const imageAsset = experience.product?.assets.find((a) => a.assetType === 'IMAGE_2D');
  const targetAsset = experience.product?.assets.find((a) => a.assetType === 'TARGET_IMAGE');

  // Fetch white-label settings for this company
  const settings = await prisma.setting.findMany({
    where: { companyId: experience.companyId },
  });
  const settingsMap: Record<string, unknown> = {};
  settings.forEach((s) => { settingsMap[s.key] = s.value; });

  return {
    experience: {
      id: experience.id,
      name: experience.name,
      slug: experience.slug,
      type: experience.experienceType,
      scale: experience.scale,
      lightingPreset: experience.lightingPreset,
      backgroundMode: experience.backgroundMode,
      ctaText: experience.ctaText,
      ctaLink: experience.ctaLink,
    },
    product: experience.product ? {
      id: experience.product.id,
      title: experience.product.title,
      description: experience.product.description,
      modelUrl: glbAsset?.filePath || null,
      usdzUrl: usdzAsset?.filePath || null,
      posterUrl: posterAsset?.filePath || null,
      targetImageUrl: targetAsset?.filePath || null,
      fallbackImageUrl: posterAsset?.filePath || thumbnailAsset?.filePath || imageAsset?.filePath || experience.product?.thumbnailUrl || null,
      scalePreset: experience.product.scalePreset,
    } : null,
    company: {
      id: experience.company.id,
      name: experience.company.name,
      slug: experience.company.slug,
      brandPrimary: experience.company.brandPrimary,
      brandSecondary: experience.company.brandSecondary,
      logoUrl: experience.company.logoUrl,
    },
    branding: {
      hideBranding: settingsMap['viewer_hide_branding'] === true,
      viewerBackground: (settingsMap['viewer_background'] as string) || 'gradient',
      logoUrl: experience.company.logoUrl,
    },
  };
}

/**
 * Fetch viewer data by product slug — finds the first published
 * PRODUCT_VIEWER or SURFACE_AR experience for that product.
 */
export async function getViewerDataByProductSlug(productSlug: string): Promise<ViewerData | null> {
  // Find product by matching slug-style title across all companies
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    include: {
      assets: true,
      company: true,
      experiences: {
        where: {
          publishStatus: 'PUBLISHED',
          experienceType: { in: ['PRODUCT_VIEWER', 'SURFACE_AR'] },
        },
        take: 1,
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  const product = products.find((p) => {
    const slug = p.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return slug === productSlug;
  });

  if (!product || product.experiences.length === 0) {
    return null;
  }

  const experience = product.experiences[0];
  return getViewerData(experience.slug);
}

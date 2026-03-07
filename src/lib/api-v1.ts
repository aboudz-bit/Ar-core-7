/**
 * Helper functions for the v1 Partner API.
 * Formats responses consistently and generates viewer URLs.
 */

const getAppUrl = () => process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export function formatProductResponse(product: {
  id: string;
  title: string;
  sku: string | null;
  category: string | null;
  description: string | null;
  brand: string | null;
  status: string;
  tags: string[];
  scalePreset: number;
  anchorType: string;
  externalId: string | null;
  externalSource: string | null;
  externalHandle: string | null;
  company: { id: string; name: string; slug: string; brandPrimary: string; logoUrl: string | null };
  assets: { assetType: string; filePath: string; fileName: string; fileSize: number }[];
  experiences?: { id: string; name: string; slug: string; experienceType: string; publishStatus: string }[];
}) {
  const appUrl = getAppUrl();
  const productSlug = product.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const glb = product.assets.find((a) => a.assetType === 'MODEL_GLB');
  const usdz = product.assets.find((a) => a.assetType === 'MODEL_USDZ');
  const poster = product.assets.find((a) => a.assetType === 'POSTER');
  const thumb = product.assets.find((a) => a.assetType === 'THUMBNAIL');

  const publishedExps = product.experiences?.filter((e) => e.publishStatus === 'PUBLISHED') || [];

  return {
    id: product.id,
    title: product.title,
    sku: product.sku,
    category: product.category,
    description: product.description,
    brand: product.brand,
    status: product.status,
    tags: product.tags,
    scalePreset: product.scalePreset,
    anchorType: product.anchorType,
    externalMapping: product.externalId ? {
      externalId: product.externalId,
      externalSource: product.externalSource,
      externalHandle: product.externalHandle,
    } : null,
    company: {
      name: product.company.name,
      slug: product.company.slug,
      brandColor: product.company.brandPrimary,
      logoUrl: product.company.logoUrl,
    },
    assets: {
      model: glb ? { url: `${appUrl}${glb.filePath}`, fileName: glb.fileName, size: glb.fileSize } : null,
      usdz: usdz ? { url: `${appUrl}${usdz.filePath}`, fileName: usdz.fileName } : null,
      poster: poster ? { url: `${appUrl}${poster.filePath}` } : null,
      thumbnail: thumb ? { url: `${appUrl}${thumb.filePath}` } : null,
    },
    urls: {
      productAr: `${appUrl}/product/${productSlug}/ar`,
      viewer: `${appUrl}/viewer/${product.company.slug}/${productSlug}`,
    },
    experiences: publishedExps.map((exp) => formatExperienceRef(exp)),
    arModes: ['webxr', 'scene-viewer', 'quick-look'],
  };
}

export function formatExperienceResponse(experience: {
  id: string;
  name: string;
  slug: string;
  experienceType: string;
  publishStatus: string;
  scale: number;
  lightingPreset: string;
  backgroundMode: string;
  ctaText: string | null;
  ctaLink: string | null;
  company: { id: string; name: string; slug: string; brandPrimary: string; logoUrl: string | null };
  product?: {
    id: string;
    title: string;
    assets: { assetType: string; filePath: string }[];
  } | null;
}) {
  const appUrl = getAppUrl();
  const glb = experience.product?.assets.find((a) => a.assetType === 'MODEL_GLB');
  const usdz = experience.product?.assets.find((a) => a.assetType === 'MODEL_USDZ');
  const poster = experience.product?.assets.find((a) => a.assetType === 'POSTER');

  return {
    id: experience.id,
    name: experience.name,
    slug: experience.slug,
    type: experience.experienceType,
    publishStatus: experience.publishStatus,
    config: {
      scale: experience.scale,
      lightingPreset: experience.lightingPreset,
      backgroundMode: experience.backgroundMode,
    },
    cta: experience.ctaText ? { text: experience.ctaText, link: experience.ctaLink } : null,
    company: {
      name: experience.company.name,
      slug: experience.company.slug,
      brandColor: experience.company.brandPrimary,
      logoUrl: experience.company.logoUrl,
    },
    product: experience.product ? {
      id: experience.product.id,
      title: experience.product.title,
    } : null,
    assets: {
      model: glb ? { url: `${appUrl}${glb.filePath}` } : null,
      usdz: usdz ? { url: `${appUrl}${usdz.filePath}` } : null,
      poster: poster ? { url: `${appUrl}${poster.filePath}` } : null,
    },
    urls: {
      viewer: `${appUrl}/ar/${experience.slug}`,
      embed: `${appUrl}/embed/${experience.slug}`,
      launch: `${appUrl}/launch/${experience.slug}`,
      qr: `${appUrl}/qr/${experience.slug}`,
    },
    embed: {
      iframe: `<iframe src="${appUrl}/embed/${experience.slug}" style="width:100%;height:600px;border:0;" allow="camera; xr-spatial-tracking" allowfullscreen></iframe>`,
    },
    arModes: ['webxr', 'scene-viewer', 'quick-look'],
  };
}

function formatExperienceRef(exp: { id: string; name: string; slug: string; experienceType: string }) {
  const appUrl = getAppUrl();
  return {
    id: exp.id,
    name: exp.name,
    slug: exp.slug,
    type: exp.experienceType,
    urls: {
      viewer: `${appUrl}/ar/${exp.slug}`,
      embed: `${appUrl}/embed/${exp.slug}`,
      launch: `${appUrl}/launch/${exp.slug}`,
    },
  };
}

export function formatAssetResponse(asset: {
  id: string;
  assetType: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  isProcessed: boolean;
  createdAt: Date;
}) {
  const appUrl = getAppUrl();
  return {
    id: asset.id,
    type: asset.assetType,
    fileName: asset.fileName,
    url: `${appUrl}${asset.filePath}`,
    size: asset.fileSize,
    mimeType: asset.mimeType,
    isProcessed: asset.isProcessed,
    createdAt: asset.createdAt,
  };
}

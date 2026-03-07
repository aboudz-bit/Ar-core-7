import { prisma } from '@/lib/prisma';

/**
 * Try-on module data types and server-side fetching logic.
 * Handles FACE_TRYON, BODY_TRYON, and CLOTHING_TRYON_PHOTO experience types.
 */

export interface TryOnOverlay {
  id: string;
  assetType: string;
  filePath: string;
  fileName: string;
  metadata: Record<string, unknown> | null;
}

export interface TryOnData {
  experience: {
    id: string;
    name: string;
    slug: string;
    type: 'FACE_TRYON' | 'BODY_TRYON' | 'CLOTHING_TRYON_PHOTO';
    scale: number;
    sceneConfig: Record<string, unknown> | null;
    ctaText: string | null;
    ctaLink: string | null;
  };
  product: {
    id: string;
    title: string;
    description: string | null;
    category: string | null;
    thumbnailUrl: string | null;
  } | null;
  company: {
    id: string;
    name: string;
    slug: string;
    brandPrimary: string;
    logoUrl: string | null;
  };
  overlays: TryOnOverlay[];
  branding: {
    hideBranding: boolean;
    logoUrl: string | null;
  };
}

/**
 * Fetch all data needed to render a try-on experience.
 * Returns null if experience doesn't exist, isn't published, or isn't a try-on type.
 */
export async function getTryOnData(experienceSlug: string): Promise<TryOnData | null> {
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

  const tryOnTypes = ['FACE_TRYON', 'BODY_TRYON', 'CLOTHING_TRYON_PHOTO'];
  if (!tryOnTypes.includes(experience.experienceType)) {
    return null;
  }

  // Filter overlay assets based on experience type
  const overlayTypeMap: Record<string, string[]> = {
    FACE_TRYON: ['FACE_OVERLAY_MODEL', 'FACE_OVERLAY_IMAGE', 'FACE_EFFECT'],
    BODY_TRYON: ['BODY_OVERLAY_MODEL', 'BODY_REFERENCE_IMAGE'],
    CLOTHING_TRYON_PHOTO: ['GARMENT_IMAGE', 'TRYON_OUTPUT_IMAGE', 'BODY_REFERENCE_IMAGE'],
  };
  const overlayTypes = overlayTypeMap[experience.experienceType] || [];

  const overlays: TryOnOverlay[] = (experience.product?.assets || [])
    .filter((a) => overlayTypes.includes(a.assetType))
    .map((a) => ({
      id: a.id,
      assetType: a.assetType,
      filePath: a.filePath,
      fileName: a.fileName,
      metadata: a.metadata as Record<string, unknown> | null,
    }));

  // Fetch branding settings
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
      type: experience.experienceType as 'FACE_TRYON' | 'BODY_TRYON' | 'CLOTHING_TRYON_PHOTO',
      scale: experience.scale,
      sceneConfig: experience.sceneConfig as Record<string, unknown> | null,
      ctaText: experience.ctaText,
      ctaLink: experience.ctaLink,
    },
    product: experience.product ? {
      id: experience.product.id,
      title: experience.product.title,
      description: experience.product.description,
      category: experience.product.category,
      thumbnailUrl: experience.product.thumbnailUrl,
    } : null,
    company: {
      id: experience.company.id,
      name: experience.company.name,
      slug: experience.company.slug,
      brandPrimary: experience.company.brandPrimary,
      logoUrl: experience.company.logoUrl,
    },
    overlays,
    branding: {
      hideBranding: settingsMap['viewer_hide_branding'] === true,
      logoUrl: experience.company.logoUrl,
    },
  };
}

/**
 * MediaPipe Face Mesh landmark indices for common face regions.
 * Used by client-side face tracking to position overlays.
 */
export const FACE_LANDMARKS = {
  // Eye region landmarks (for glasses/eyewear)
  LEFT_EYE_OUTER: 33,
  LEFT_EYE_INNER: 133,
  RIGHT_EYE_OUTER: 263,
  RIGHT_EYE_INNER: 362,
  LEFT_EYE_TOP: 159,
  LEFT_EYE_BOTTOM: 145,
  RIGHT_EYE_TOP: 386,
  RIGHT_EYE_BOTTOM: 374,

  // Nose bridge (for glasses bridge positioning)
  NOSE_BRIDGE_TOP: 6,
  NOSE_BRIDGE_MID: 197,
  NOSE_TIP: 1,

  // Ear anchors (for glasses temples)
  LEFT_EAR: 234,
  RIGHT_EAR: 454,

  // Forehead (for hats/headwear)
  FOREHEAD_CENTER: 10,
  FOREHEAD_LEFT: 67,
  FOREHEAD_RIGHT: 297,

  // Chin/jaw (for necklaces, face shape)
  CHIN: 152,
  JAW_LEFT: 172,
  JAW_RIGHT: 397,

  // Lips (for lip products)
  UPPER_LIP_CENTER: 0,
  LOWER_LIP_CENTER: 17,
  MOUTH_LEFT: 61,
  MOUTH_RIGHT: 291,

  // Face oval key points
  FACE_OVAL: [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109],
} as const;

/**
 * Configuration for different overlay placement modes.
 */
export const OVERLAY_CONFIGS = {
  GLASSES: {
    anchorPoints: ['LEFT_EYE_OUTER', 'RIGHT_EYE_OUTER', 'NOSE_BRIDGE_TOP'] as const,
    defaultScale: 1.0,
    defaultOffsetY: 0,
    smoothingFactor: 0.3,
  },
  HAT: {
    anchorPoints: ['FOREHEAD_CENTER', 'FOREHEAD_LEFT', 'FOREHEAD_RIGHT'] as const,
    defaultScale: 1.2,
    defaultOffsetY: -0.05,
    smoothingFactor: 0.25,
  },
  EARRING: {
    anchorPoints: ['LEFT_EAR', 'RIGHT_EAR'] as const,
    defaultScale: 0.3,
    defaultOffsetY: 0.02,
    smoothingFactor: 0.35,
  },
  NECKLACE: {
    anchorPoints: ['CHIN', 'JAW_LEFT', 'JAW_RIGHT'] as const,
    defaultScale: 0.8,
    defaultOffsetY: 0.05,
    smoothingFactor: 0.2,
  },
} as const;

export type OverlayPlacement = keyof typeof OVERLAY_CONFIGS;

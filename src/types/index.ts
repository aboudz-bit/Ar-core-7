export type {
  User,
  Company,
  Membership,
  Product,
  ProductAsset,
  Experience,
  PublishRecord,
  AnalyticsEvent,
  Setting,
  AuditLog,
  TryOnJob,
} from '@prisma/client';

export type {
  UserRole,
  ProductStatus,
  PublishStatus,
  ExperienceType,
  AssetType,
} from '@prisma/client';

export interface JWTPayload {
  userId: string;
  email: string;
  memberships: {
    companyId: string;
    companySlug: string;
    role: string;
  }[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface SceneConfig {
  lightingPreset: 'studio' | 'outdoor' | 'neutral' | 'warm' | 'cool';
  backgroundColor: string;
  ambientIntensity: number;
  directionalIntensity: number;
  shadowEnabled: boolean;
  autoRotate: boolean;
  autoRotateSpeed: number;
  cameraOrbit: string;
  minCameraOrbit: string;
  maxCameraOrbit: string;
  fieldOfView: string;
  environmentImage: string | null;
}

export interface ViewerConfig {
  modelUrl: string;
  usdzUrl?: string;
  posterUrl?: string;
  alt: string;
  ar: boolean;
  arModes: string;
  autoRotate: boolean;
  cameraControls: boolean;
  sceneConfig: Partial<SceneConfig>;
}

export interface DashboardStats {
  totalCompanies: number;
  totalProducts: number;
  totalExperiences: number;
  publishedExperiences: number;
  totalViews: number;
  totalArLaunches: number;
  recentEvents: {
    date: string;
    views: number;
    arLaunches: number;
  }[];
}

export const ALLOWED_MODEL_TYPES = ['model/gltf-binary', 'model/gltf+json', 'application/octet-stream'];
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_USDZ_TYPES = ['model/vnd.usdz+zip', 'application/octet-stream'];

export const LIGHTING_PRESETS: Record<string, Partial<SceneConfig>> = {
  studio: {
    ambientIntensity: 0.5,
    directionalIntensity: 1.0,
    shadowEnabled: true,
    environmentImage: null,
  },
  outdoor: {
    ambientIntensity: 0.8,
    directionalIntensity: 1.2,
    shadowEnabled: true,
    environmentImage: null,
  },
  neutral: {
    ambientIntensity: 0.6,
    directionalIntensity: 0.8,
    shadowEnabled: false,
    environmentImage: null,
  },
  warm: {
    ambientIntensity: 0.7,
    directionalIntensity: 0.9,
    shadowEnabled: true,
    environmentImage: null,
  },
  cool: {
    ambientIntensity: 0.5,
    directionalIntensity: 1.0,
    shadowEnabled: true,
    environmentImage: null,
  },
};

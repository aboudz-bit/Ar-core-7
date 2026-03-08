import { prisma } from '@/lib/prisma';

export interface CreateMerchantProductInput {
  companyId: string;
  title: string;
  garmentImagePath: string;
  category: string;
  fitType?: string;
  sizingSystem?: string;
  sizeChart?: Record<string, Record<string, number | undefined>>;
  garmentLength?: number;
  sleeveLength?: number;
  shoulderSpec?: number;
  chestSpec?: number;
  drapeFactor?: number;
  thumbnailUrl?: string;
}

export interface UpdateMerchantProductInput {
  title?: string;
  category?: string;
  fitType?: string;
  sizingSystem?: string;
  sizeChart?: Record<string, Record<string, number | undefined>> | null;
  garmentLength?: number | null;
  sleeveLength?: number | null;
  shoulderSpec?: number | null;
  chestSpec?: number | null;
  drapeFactor?: number;
  garmentImagePath?: string;
  thumbnailUrl?: string;
  isActive?: boolean;
}

const VALID_CATEGORIES = ['thobe', 'abaya', 't-shirt', 'jacket', 'shirt', 'hoodie', 'sweater', 'polo', 'dress', 'other'];
const VALID_FIT_TYPES = ['slim', 'regular', 'oversized', 'loose'];
const VALID_SIZING_SYSTEMS = ['letter', 'numeric', 'custom'];

export async function createMerchantProduct(input: CreateMerchantProductInput) {
  if (!VALID_CATEGORIES.includes(input.category)) {
    throw new Error(`Invalid category: ${input.category}`);
  }
  if (input.fitType && !VALID_FIT_TYPES.includes(input.fitType)) {
    throw new Error(`Invalid fitType: ${input.fitType}`);
  }
  if (input.sizingSystem && !VALID_SIZING_SYSTEMS.includes(input.sizingSystem)) {
    throw new Error(`Invalid sizingSystem: ${input.sizingSystem}`);
  }

  return prisma.merchantProduct.create({
    data: {
      companyId: input.companyId,
      title: input.title,
      garmentImagePath: input.garmentImagePath,
      category: input.category,
      fitType: input.fitType || 'regular',
      sizingSystem: input.sizingSystem || 'letter',
      sizeChart: input.sizeChart ? JSON.parse(JSON.stringify(input.sizeChart)) : undefined,
      garmentLength: input.garmentLength,
      sleeveLength: input.sleeveLength,
      shoulderSpec: input.shoulderSpec,
      chestSpec: input.chestSpec,
      drapeFactor: input.drapeFactor ?? 1.0,
      thumbnailUrl: input.thumbnailUrl,
    },
  });
}

export async function updateMerchantProduct(id: string, companyId: string, input: UpdateMerchantProductInput) {
  if (input.category && !VALID_CATEGORIES.includes(input.category)) {
    throw new Error(`Invalid category: ${input.category}`);
  }
  if (input.fitType && !VALID_FIT_TYPES.includes(input.fitType)) {
    throw new Error(`Invalid fitType: ${input.fitType}`);
  }
  if (input.sizingSystem && !VALID_SIZING_SYSTEMS.includes(input.sizingSystem)) {
    throw new Error(`Invalid sizingSystem: ${input.sizingSystem}`);
  }

  // Ensure product belongs to the company
  const existing = await prisma.merchantProduct.findFirst({
    where: { id, companyId },
  });
  if (!existing) {
    throw new Error('Product not found');
  }

  const data: Record<string, unknown> = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.category !== undefined) data.category = input.category;
  if (input.fitType !== undefined) data.fitType = input.fitType;
  if (input.sizingSystem !== undefined) data.sizingSystem = input.sizingSystem;
  if (input.sizeChart !== undefined) data.sizeChart = input.sizeChart ? JSON.parse(JSON.stringify(input.sizeChart)) : null;
  if (input.garmentLength !== undefined) data.garmentLength = input.garmentLength;
  if (input.sleeveLength !== undefined) data.sleeveLength = input.sleeveLength;
  if (input.shoulderSpec !== undefined) data.shoulderSpec = input.shoulderSpec;
  if (input.chestSpec !== undefined) data.chestSpec = input.chestSpec;
  if (input.drapeFactor !== undefined) data.drapeFactor = input.drapeFactor;
  if (input.garmentImagePath !== undefined) data.garmentImagePath = input.garmentImagePath;
  if (input.thumbnailUrl !== undefined) data.thumbnailUrl = input.thumbnailUrl;
  if (input.isActive !== undefined) data.isActive = input.isActive;

  return prisma.merchantProduct.update({
    where: { id },
    data,
  });
}

export async function listMerchantProducts(companyId: string) {
  return prisma.merchantProduct.findMany({
    where: { companyId, isActive: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getMerchantProduct(id: string, companyId: string) {
  return prisma.merchantProduct.findFirst({
    where: { id, companyId },
  });
}

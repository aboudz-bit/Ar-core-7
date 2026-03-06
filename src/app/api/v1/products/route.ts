import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiKey, checkRateLimit } from '@/lib/api-auth';
import { formatProductResponse } from '@/lib/api-v1';

export async function GET(req: NextRequest) {
  const { context, error } = await requireApiKey(req);
  if (error) return error;

  const rateLimitError = checkRateLimit(context.apiKeyId);
  if (rateLimitError) return rateLimitError;

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || 'ACTIVE';

  const where = {
    companyId: context.companyId,
    status: status as 'DRAFT' | 'ACTIVE' | 'ARCHIVED',
    ...(search ? { title: { contains: search, mode: 'insensitive' as const } } : {}),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        company: { select: { id: true, name: true, slug: true, brandPrimary: true, logoUrl: true } },
        assets: { select: { assetType: true, filePath: true, fileName: true, fileSize: true } },
        experiences: {
          where: { publishStatus: 'PUBLISHED' },
          select: { id: true, name: true, slug: true, experienceType: true, publishStatus: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: products.map((p) => formatProductResponse(p as Parameters<typeof formatProductResponse>[0])),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

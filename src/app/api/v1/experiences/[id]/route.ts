import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireApiKey, checkRateLimit } from '@/lib/api-auth';
import { formatExperienceResponse } from '@/lib/api-v1';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { context, error } = await requireApiKey(req);
  if (error) return error;

  const rateLimitError = await checkRateLimit(context.apiKeyId);
  if (rateLimitError) return rateLimitError;

  const experience = await prisma.experience.findFirst({
    where: { id: params.id, companyId: context.companyId, publishStatus: 'PUBLISHED' },
    include: {
      company: { select: { id: true, name: true, slug: true, brandPrimary: true, logoUrl: true } },
      product: {
        select: { id: true, title: true, assets: { select: { assetType: true, filePath: true } } },
      },
    },
  });

  if (!experience) {
    return NextResponse.json({ success: false, error: 'Experience not found or not published' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: formatExperienceResponse(experience as Parameters<typeof formatExperienceResponse>[0]),
  });
}

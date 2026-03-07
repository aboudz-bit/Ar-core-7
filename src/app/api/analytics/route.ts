import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, isSuperAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  const days = Math.max(1, Math.min(365, parseInt(searchParams.get('days') || '30') || 30));

  const companyIds = isSuperAdmin(session)
    ? companyId ? [companyId] : undefined
    : session.memberships.map((m) => m.companyId);

  const since = new Date();
  since.setDate(since.getDate() - days);

  const where = {
    createdAt: { gte: since },
    ...(companyIds ? { companyId: { in: companyIds } } : {}),
  };

  const [totalViews, totalArLaunches, totalSessions, events] = await Promise.all([
    prisma.analyticsEvent.count({ where: { ...where, eventType: 'page_view' } }),
    prisma.analyticsEvent.count({ where: { ...where, eventType: 'ar_launch' } }),
    prisma.analyticsEvent.count({ where: { ...where, eventType: 'tracking_session' } }),
    prisma.analyticsEvent.findMany({
      where,
      select: {
        eventType: true,
        createdAt: true,
        deviceType: true,
        browser: true,
        launchSource: true,
        experienceId: true,
        productId: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  // Group by day
  const dailyMap: Record<string, { views: number; arLaunches: number }> = {};
  const deviceMap: Record<string, number> = {};
  const browserMap: Record<string, number> = {};
  const sourceMap: Record<string, number> = {};
  const experienceMap: Record<string, number> = {};
  const productMap: Record<string, number> = {};

  events.forEach((e) => {
    const day = e.createdAt.toISOString().split('T')[0];
    if (!dailyMap[day]) dailyMap[day] = { views: 0, arLaunches: 0 };
    if (e.eventType === 'page_view') dailyMap[day].views++;
    if (e.eventType === 'ar_launch') dailyMap[day].arLaunches++;

    const device = e.deviceType || 'unknown';
    deviceMap[device] = (deviceMap[device] || 0) + 1;

    const browser = e.browser || 'unknown';
    browserMap[browser] = (browserMap[browser] || 0) + 1;

    const source = e.launchSource || 'direct';
    sourceMap[source] = (sourceMap[source] || 0) + 1;

    if (e.experienceId) {
      experienceMap[e.experienceId] = (experienceMap[e.experienceId] || 0) + 1;
    }
    if (e.productId) {
      productMap[e.productId] = (productMap[e.productId] || 0) + 1;
    }
  });

  const recentEvents = Object.entries(dailyMap)
    .map(([date, data]) => ({ date, ...data }))
    .slice(-14);

  // Resolve top experience/product names
  const topExperienceIds = Object.entries(experienceMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id]) => id);

  const topProductIds = Object.entries(productMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id]) => id);

  const [topExperiences, topProducts] = await Promise.all([
    topExperienceIds.length > 0
      ? prisma.experience.findMany({
          where: { id: { in: topExperienceIds } },
          select: { id: true, name: true, slug: true },
        })
      : Promise.resolve([]),
    topProductIds.length > 0
      ? prisma.product.findMany({
          where: { id: { in: topProductIds } },
          select: { id: true, title: true },
        })
      : Promise.resolve([]),
  ]);

  const topExperiencesList = topExperienceIds.map((id) => {
    const exp = topExperiences.find((e) => e.id === id);
    return { id, name: exp?.name || 'Unknown', slug: exp?.slug || '', count: experienceMap[id] };
  });

  const topProductsList = topProductIds.map((id) => {
    const prod = topProducts.find((p) => p.id === id);
    return { id, name: prod?.title || 'Unknown', count: productMap[id] };
  });

  const toBreakdown = (map: Record<string, number>) =>
    Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([label, count]) => ({ label, count }));

  return NextResponse.json({
    success: true,
    data: {
      totalViews,
      totalArLaunches,
      totalSessions,
      recentEvents,
      deviceBreakdown: toBreakdown(deviceMap),
      browserBreakdown: toBreakdown(browserMap),
      sourceBreakdown: toBreakdown(sourceMap),
      topExperiences: topExperiencesList,
      topProducts: topProductsList,
    },
  });
}

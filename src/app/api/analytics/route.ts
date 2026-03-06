import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, isSuperAdmin } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');
  const days = parseInt(searchParams.get('days') || '30');

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
      select: { eventType: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  // Group by day
  const dailyMap: Record<string, { views: number; arLaunches: number }> = {};
  events.forEach((e) => {
    const day = e.createdAt.toISOString().split('T')[0];
    if (!dailyMap[day]) dailyMap[day] = { views: 0, arLaunches: 0 };
    if (e.eventType === 'page_view') dailyMap[day].views++;
    if (e.eventType === 'ar_launch') dailyMap[day].arLaunches++;
  });

  const recentEvents = Object.entries(dailyMap)
    .map(([date, data]) => ({ date, ...data }))
    .slice(-14);

  return NextResponse.json({
    success: true,
    data: {
      totalViews,
      totalArLaunches,
      totalSessions,
      recentEvents,
    },
  });
}

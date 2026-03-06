import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyId, productId, experienceId, eventType, eventData, sessionId, duration } = body;

    if (!companyId || !eventType) {
      return NextResponse.json({ success: false, error: 'companyId and eventType required' }, { status: 400 });
    }

    await prisma.analyticsEvent.create({
      data: {
        companyId,
        productId: productId || null,
        experienceId: experienceId || null,
        eventType,
        eventData: eventData || null,
        sessionId: sessionId || null,
        userAgent: req.headers.get('user-agent') || null,
        ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
        duration: duration || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics track error:', error);
    return NextResponse.json({ success: false, error: 'Failed to track' }, { status: 500 });
  }
}

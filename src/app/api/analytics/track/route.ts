import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseDeviceType, parseBrowser, parseCountry, determineLaunchSource } from '@/lib/analytics';
import { dispatchWebhook } from '@/lib/webhooks';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyId, productId, experienceId, eventType, eventData, sessionId, duration } = body;

    if (!companyId || !eventType) {
      return NextResponse.json({ success: false, error: 'companyId and eventType required' }, { status: 400 });
    }

    const ua = req.headers.get('user-agent');
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
    const referrer = req.headers.get('referer') || null;

    await prisma.analyticsEvent.create({
      data: {
        companyId,
        productId: productId || null,
        experienceId: experienceId || null,
        eventType,
        eventData: eventData || null,
        sessionId: sessionId || null,
        userAgent: ua,
        ipAddress: ip,
        duration: duration || null,
        deviceType: parseDeviceType(ua),
        browser: parseBrowser(ua),
        country: parseCountry(ip),
        launchSource: determineLaunchSource(referrer, eventData as Record<string, unknown> | undefined),
        referrer,
      },
    });

    // Dispatch webhooks for view/launch events
    if (eventType === 'page_view') {
      dispatchWebhook(companyId, 'ar_viewed', { experienceId, productId, eventType }).catch(() => {});
    } else if (eventType === 'ar_launch') {
      dispatchWebhook(companyId, 'ar_launched', { experienceId, productId, eventType }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics track error:', error);
    return NextResponse.json({ success: false, error: 'Failed to track' }, { status: 500 });
  }
}

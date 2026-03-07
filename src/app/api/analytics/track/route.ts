import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { parseDeviceType, parseBrowser, parseCountry, determineLaunchSource } from '@/lib/analytics';
import { dispatchWebhook } from '@/lib/webhooks';

export const dynamic = 'force-dynamic';

// Simple in-memory rate limiter for the public analytics endpoint
const trackRateLimit = new Map<string, { count: number; resetAt: number }>();
const TRACK_RATE_LIMIT = 60; // requests per minute per IP
const TRACK_RATE_WINDOW = 60_000; // 1 minute

// Cleanup stale entries every 2 minutes
setInterval(() => {
  const now = Date.now();
  trackRateLimit.forEach((entry, key) => {
    if (now > entry.resetAt) trackRateLimit.delete(key);
  });
}, 120_000);

// Allowed event types to prevent arbitrary data injection
const ALLOWED_EVENT_TYPES = [
  'page_view', 'embed_view', 'ar_launch', 'ar_session_start',
  'image_ar_start', 'tracking_session', 'qr_scan', 'cta_click',
];

function hashIp(ip: string): string {
  return createHash('sha256').update(ip + (process.env.JWT_SECRET || '')).digest('hex').slice(0, 16);
}

export async function POST(req: NextRequest) {
  try {
    // Rate limit by IP
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const now = Date.now();
    const rateLimitKey = `track:${clientIp}`;
    const entry = trackRateLimit.get(rateLimitKey);

    if (entry && now < entry.resetAt) {
      entry.count++;
      if (entry.count > TRACK_RATE_LIMIT) {
        return NextResponse.json({ success: false, error: 'Rate limited' }, { status: 429 });
      }
    } else {
      trackRateLimit.set(rateLimitKey, { count: 1, resetAt: now + TRACK_RATE_WINDOW });
    }

    const body = await req.json();
    const { companyId, productId, experienceId, eventType, eventData, sessionId, duration } = body;

    if (!companyId || !eventType) {
      return NextResponse.json({ success: false, error: 'companyId and eventType required' }, { status: 400 });
    }

    // Validate event type
    if (!ALLOWED_EVENT_TYPES.includes(eventType)) {
      return NextResponse.json({ success: false, error: 'Invalid eventType' }, { status: 400 });
    }

    // Validate IDs are strings and reasonable length to prevent injection
    if (typeof companyId !== 'string' || companyId.length > 100) {
      return NextResponse.json({ success: false, error: 'Invalid companyId' }, { status: 400 });
    }
    if (productId && (typeof productId !== 'string' || productId.length > 100)) {
      return NextResponse.json({ success: false, error: 'Invalid productId' }, { status: 400 });
    }
    if (experienceId && (typeof experienceId !== 'string' || experienceId.length > 100)) {
      return NextResponse.json({ success: false, error: 'Invalid experienceId' }, { status: 400 });
    }

    // Verify the companyId exists (prevents storing data for non-existent companies)
    const companyExists = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });
    if (!companyExists) {
      return NextResponse.json({ success: false, error: 'Invalid companyId' }, { status: 400 });
    }

    const ua = req.headers.get('user-agent');
    const referrer = req.headers.get('referer') || null;

    // Hash IP for privacy (GDPR compliance) — never store raw IPs
    const hashedIp = clientIp !== 'unknown' ? hashIp(clientIp) : null;

    await prisma.analyticsEvent.create({
      data: {
        companyId,
        productId: productId || null,
        experienceId: experienceId || null,
        eventType,
        eventData: eventData || null,
        sessionId: sessionId || null,
        userAgent: ua ? ua.slice(0, 500) : null, // Truncate to prevent oversized UA strings
        ipAddress: hashedIp,
        duration: duration || null,
        deviceType: parseDeviceType(ua),
        browser: parseBrowser(ua),
        country: parseCountry(clientIp), // Use raw IP for geo lookup only, don't store
        launchSource: determineLaunchSource(referrer, eventData as Record<string, unknown> | undefined),
        referrer: referrer ? referrer.slice(0, 2000) : null, // Truncate
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

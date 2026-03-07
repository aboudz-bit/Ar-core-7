/**
 * Analytics utilities for enhanced event tracking.
 */

/**
 * Parse device type from User-Agent string.
 */
export function parseDeviceType(ua: string | null): string {
  if (!ua) return 'unknown';
  const lower = ua.toLowerCase();
  if (/ipad/.test(lower)) return 'tablet';
  if (/iphone|ipod/.test(lower)) return 'mobile';
  if (/android/.test(lower)) {
    if (/mobile/.test(lower)) return 'mobile';
    return 'tablet';
  }
  if (/mobile/.test(lower)) return 'mobile';
  return 'desktop';
}

/**
 * Parse browser name from User-Agent string.
 */
export function parseBrowser(ua: string | null): string {
  if (!ua) return 'unknown';
  if (/edg/i.test(ua)) return 'Edge';
  if (/chrome/i.test(ua) && !/chromium/i.test(ua)) return 'Chrome';
  if (/firefox/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
  if (/opera|opr/i.test(ua)) return 'Opera';
  return 'Other';
}

/**
 * Parse country from IP address (basic GeoIP using timezone heuristic).
 * For production, integrate MaxMind GeoIP2 or similar.
 */
export function parseCountry(_ip: string | null): string | null {
  // Placeholder — returns null until a GeoIP service is configured
  // In production, use: MaxMind, ip-api.com, or Cloudflare headers
  return null;
}

/**
 * Determine launch source from referrer/context.
 */
export function determineLaunchSource(
  referrer: string | null,
  eventData?: Record<string, unknown>
): string {
  if (eventData?.source) return String(eventData.source);
  if (!referrer) return 'direct';
  if (referrer.includes('/embed/')) return 'embed';
  if (referrer.includes('/qr/')) return 'qr';
  if (referrer.includes('sdk')) return 'sdk';
  return 'direct';
}

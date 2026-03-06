import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './prisma';
import { hashApiKey, parseApiKeyFromHeader } from './api-keys';

export interface ApiKeyContext {
  apiKeyId: string;
  companyId: string;
  companySlug: string;
  environment: string;
}

/**
 * Validate an API key from request headers.
 * Returns the API key context or null if invalid.
 */
export async function validateApiKey(req: NextRequest): Promise<ApiKeyContext | null> {
  const authHeader = req.headers.get('authorization');
  const rawKey = parseApiKeyFromHeader(authHeader);
  if (!rawKey) return null;

  const hashed = hashApiKey(rawKey);

  const apiKey = await prisma.apiKey.findFirst({
    where: {
      hashedSecret: hashed,
      status: 'ACTIVE',
    },
    include: {
      company: { select: { id: true, slug: true, isActive: true } },
    },
  });

  if (!apiKey || !apiKey.company.isActive) return null;

  // Update lastUsedAt (fire and forget)
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  return {
    apiKeyId: apiKey.id,
    companyId: apiKey.companyId,
    companySlug: apiKey.company.slug,
    environment: apiKey.environment,
  };
}

/**
 * Require API key auth. Returns error response if invalid.
 */
export async function requireApiKey(req: NextRequest): Promise<
  { context: ApiKeyContext; error: null } | { context: null; error: NextResponse }
> {
  const context = await validateApiKey(req);
  if (!context) {
    return {
      context: null,
      error: NextResponse.json(
        { success: false, error: 'Invalid or missing API key. Use header: Authorization: Bearer ak_...' },
        { status: 401 }
      ),
    };
  }
  return { context, error: null };
}

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 120; // requests per window

/**
 * Check rate limit for an API key.
 * Returns error response if rate limited, null otherwise.
 */
export function checkRateLimit(apiKeyId: string): NextResponse | null {
  const now = Date.now();
  const entry = rateLimitMap.get(apiKeyId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(apiKeyId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return null;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded. Try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(entry.resetAt / 1000)),
        },
      }
    );
  }

  return null;
}

// Periodic cleanup of expired entries
setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((entry, key) => {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  });
}, 60_000);

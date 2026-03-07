import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './prisma';
import { hashApiKey, parseApiKeyFromHeader } from './api-keys';
import { getRateLimiter } from './rate-limiter';

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

  // Update lastUsedAt (fire and forget — void to signal intentional no-await)
  void prisma.apiKey.update({
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

/**
 * Check rate limit for an API key.
 * Uses Redis when available, falls back to in-memory.
 */
export async function checkRateLimit(apiKeyId: string): Promise<NextResponse | null> {
  const limiter = getRateLimiter();
  const result = await limiter.check(apiKeyId);

  if (result.limited) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded. Try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(result.retryAfter),
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(result.resetAt),
        },
      }
    );
  }

  return null;
}

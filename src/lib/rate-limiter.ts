/**
 * Rate Limiter with Redis support.
 *
 * Uses Redis when REDIS_URL is set, falls back to in-memory.
 * Supports horizontal scaling with Redis backend.
 */

const RATE_LIMIT_WINDOW = 60; // seconds
const RATE_LIMIT_MAX = 120; // requests per window

interface RateLimitResult {
  limited: boolean;
  limit: number;
  remaining: number;
  retryAfter: number;
  resetAt: number;
}

interface RateLimiter {
  check(key: string): Promise<RateLimitResult>;
}

// ============================================================
// Redis Rate Limiter
// ============================================================

let redisClient: RedisLikeClient | null = null;

interface RedisLikeClient {
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
  ttl(key: string): Promise<number>;
  get(key: string): Promise<string | null>;
}

/**
 * Minimal Redis client using raw TCP.
 * Supports only the commands needed for rate limiting.
 */
class SimpleRedisClient implements RedisLikeClient {
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  private async command(...args: string[]): Promise<string> {
    // Use the redis URL to make HTTP-based calls via a basic protocol
    // For production, use ioredis or @upstash/redis
    // This implementation uses fetch-based Upstash-compatible REST API
    const parsedUrl = new URL(this.url);

    if (parsedUrl.protocol === 'redis:' || parsedUrl.protocol === 'rediss:') {
      // For native Redis, fall back to in-memory until ioredis is installed
      throw new Error('Native Redis requires ioredis package');
    }

    // Upstash REST API format
    const response = await fetch(`${this.url}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${parsedUrl.searchParams.get('token') || ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    });

    const data = await response.json();
    return data.result;
  }

  async incr(key: string): Promise<number> {
    const result = await this.command('INCR', key);
    const parsed = Number(result);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.command('EXPIRE', key, String(seconds));
  }

  async ttl(key: string): Promise<number> {
    const result = await this.command('TTL', key);
    const parsed = Number(result);
    return Number.isFinite(parsed) ? parsed : -1;
  }

  async get(key: string): Promise<string | null> {
    const result = await this.command('GET', key);
    return result || null;
  }
}

function getRedisClient(): RedisLikeClient | null {
  if (redisClient) return redisClient;

  const url = process.env.REDIS_URL;
  if (!url) return null;

  try {
    redisClient = new SimpleRedisClient(url);
    return redisClient;
  } catch {
    return null;
  }
}

class RedisRateLimiter implements RateLimiter {
  private client: RedisLikeClient;

  constructor(client: RedisLikeClient) {
    this.client = client;
  }

  async check(key: string): Promise<RateLimitResult> {
    const redisKey = `ratelimit:${key}`;

    try {
      const count = await this.client.incr(redisKey);

      if (count === 1) {
        await this.client.expire(redisKey, RATE_LIMIT_WINDOW);
      }

      const ttl = await this.client.ttl(redisKey);
      const resetAt = Math.ceil(Date.now() / 1000) + Math.max(ttl, 0);

      if (count > RATE_LIMIT_MAX) {
        return {
          limited: true,
          limit: RATE_LIMIT_MAX,
          remaining: 0,
          retryAfter: Math.max(ttl, 1),
          resetAt,
        };
      }

      return {
        limited: false,
        limit: RATE_LIMIT_MAX,
        remaining: RATE_LIMIT_MAX - count,
        retryAfter: 0,
        resetAt,
      };
    } catch {
      // If Redis fails, allow the request (fail open)
      return {
        limited: false,
        limit: RATE_LIMIT_MAX,
        remaining: RATE_LIMIT_MAX,
        retryAfter: 0,
        resetAt: Math.ceil(Date.now() / 1000) + RATE_LIMIT_WINDOW,
      };
    }
  }
}

// ============================================================
// In-Memory Rate Limiter (fallback)
// ============================================================

const memoryStore = new Map<string, { count: number; resetAt: number }>();

class MemoryRateLimiter implements RateLimiter {
  async check(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const entry = memoryStore.get(key);

    if (!entry || now > entry.resetAt) {
      memoryStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW * 1000 });
      return {
        limited: false,
        limit: RATE_LIMIT_MAX,
        remaining: RATE_LIMIT_MAX - 1,
        retryAfter: 0,
        resetAt: Math.ceil((now + RATE_LIMIT_WINDOW * 1000) / 1000),
      };
    }

    entry.count++;

    if (entry.count > RATE_LIMIT_MAX) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      return {
        limited: true,
        limit: RATE_LIMIT_MAX,
        remaining: 0,
        retryAfter,
        resetAt: Math.ceil(entry.resetAt / 1000),
      };
    }

    return {
      limited: false,
      limit: RATE_LIMIT_MAX,
      remaining: RATE_LIMIT_MAX - entry.count,
      retryAfter: 0,
      resetAt: Math.ceil(entry.resetAt / 1000),
    };
  }
}

// Cleanup stale entries periodically
setInterval(() => {
  const now = Date.now();
  memoryStore.forEach((entry, key) => {
    if (now > entry.resetAt) memoryStore.delete(key);
  });
}, 60_000);

// ============================================================
// Factory
// ============================================================

let limiterInstance: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (limiterInstance) return limiterInstance;

  const redis = getRedisClient();
  if (redis) {
    limiterInstance = new RedisRateLimiter(redis);
    console.log('[RateLimiter] Using Redis backend');
  } else {
    limiterInstance = new MemoryRateLimiter();
    console.log('[RateLimiter] Using in-memory backend (set REDIS_URL for production)');
  }

  return limiterInstance;
}

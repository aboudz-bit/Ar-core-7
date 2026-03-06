import { randomBytes, createHash } from 'crypto';

const KEY_PREFIX = 'ak';
const PREFIX_LENGTH = 8; // visible prefix for identification

/**
 * Generate a new API key pair.
 * Returns { fullKey, keyPrefix, hashedSecret }.
 * fullKey is shown once to the user, then discarded.
 */
export function generateApiKey(environment: 'test' | 'live' = 'live'): {
  fullKey: string;
  keyPrefix: string;
  hashedSecret: string;
} {
  const envPrefix = environment === 'test' ? 'test' : 'live';
  const secret = randomBytes(32).toString('base64url');
  const fullKey = `${KEY_PREFIX}_${envPrefix}_${secret}`;
  const keyPrefix = fullKey.slice(0, PREFIX_LENGTH + KEY_PREFIX.length + envPrefix.length + 2);
  const hashedSecret = hashApiKey(fullKey);

  return { fullKey, keyPrefix, hashedSecret };
}

/**
 * Hash an API key for storage.
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Parse a Bearer token from Authorization header.
 * Returns null if not a valid API key format.
 */
export function parseApiKeyFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(ak_.+)$/);
  return match ? match[1] : null;
}

/**
 * Mask an API key for safe display.
 * Shows prefix + last 4 chars.
 */
export function maskApiKey(keyPrefix: string): string {
  return `${keyPrefix}...`;
}

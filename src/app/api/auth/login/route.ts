import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createToken } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import type { JWTPayload } from '@/types';

export const dynamic = 'force-dynamic';

// Login rate limiter: 10 attempts per 15 minutes per IP
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const LOGIN_RATE_LIMIT = 10;
const LOGIN_RATE_WINDOW = 15 * 60 * 1000; // 15 minutes

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  loginAttempts.forEach((entry, key) => {
    if (now > entry.resetAt) loginAttempts.delete(key);
  });
}, 5 * 60 * 1000);

export async function POST(req: NextRequest) {
  try {
    // Rate limit by IP
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const now = Date.now();
    const entry = loginAttempts.get(clientIp);

    if (entry && now < entry.resetAt) {
      entry.count++;
      if (entry.count > LOGIN_RATE_LIMIT) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        return NextResponse.json(
          { success: false, error: 'Too many login attempts. Please try again later.' },
          { status: 429, headers: { 'Retry-After': String(retryAfter) } }
        );
      }
    } else {
      loginAttempts.set(clientIp, { count: 1, resetAt: now + LOGIN_RATE_WINDOW });
    }

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Validate input types
    if (typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid input' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        memberships: {
          include: { company: { select: { id: true, slug: true } } },
        },
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Successful login — reset rate limit counter for this IP
    loginAttempts.delete(clientIp);

    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      memberships: user.memberships.map((m) => ({
        companyId: m.companyId,
        companySlug: m.company.slug,
        role: m.role,
      })),
    };

    const token = await createToken(payload);

    await logAudit({
      userId: user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          memberships: payload.memberships,
        },
      },
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error: unknown) {
    console.error('Login error:', error);
    const isConnectionError =
      error instanceof Error &&
      (error.message.includes('connect') ||
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('P1001') ||
        error.message.includes('P1002'));
    return NextResponse.json(
      {
        success: false,
        error: isConnectionError
          ? 'Database connection failed. Please check DATABASE_URL configuration.'
          : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

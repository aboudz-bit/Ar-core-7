import { NextRequest, NextResponse } from 'next/server';
import { getSession, isSuperAdmin } from '@/lib/auth';
import { createTryOnJob, listTryOnJobs } from '@/services/virtual-tryon';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tryon-jobs — List try-on jobs for the user's companies.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');

  // Validate access
  if (companyId && !isSuperAdmin(session) && !session.memberships.some((m) => m.companyId === companyId)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const targetCompanyId = companyId || session.memberships[0]?.companyId;
  if (!targetCompanyId) {
    return NextResponse.json({ success: false, error: 'No company found' }, { status: 400 });
  }

  const jobs = await listTryOnJobs(targetCompanyId);
  return NextResponse.json({ success: true, data: jobs });
}

/**
 * POST /api/tryon-jobs — Create a new try-on job.
 * Accepts multipart form data with personImage and garmentImage.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await req.formData();
    const companyId = formData.get('companyId') as string;
    const experienceId = formData.get('experienceId') as string | null;
    const personImageFile = formData.get('personImage') as File | null;
    const garmentImageFile = formData.get('garmentImage') as File | null;
    const garmentImagePath = formData.get('garmentImagePath') as string | null;

    if (!companyId) {
      return NextResponse.json({ success: false, error: 'companyId is required' }, { status: 400 });
    }

    // Tenant check
    if (!isSuperAdmin(session) && !session.memberships.some((m) => m.companyId === companyId)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    if (!personImageFile) {
      return NextResponse.json({ success: false, error: 'Person image is required' }, { status: 400 });
    }

    if (!garmentImageFile && !garmentImagePath) {
      return NextResponse.json({ success: false, error: 'Garment image is required' }, { status: 400 });
    }

    // Validate MIME types
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(personImageFile.type)) {
      return NextResponse.json({ success: false, error: 'Invalid person image type' }, { status: 400 });
    }
    if (garmentImageFile && !allowedTypes.includes(garmentImageFile.type)) {
      return NextResponse.json({ success: false, error: 'Invalid garment image type' }, { status: 400 });
    }

    // Save uploaded files
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'tryon', companyId);
    await mkdir(uploadDir, { recursive: true });

    const timestamp = Date.now();
    const personExt = personImageFile.name.split('.').pop() || 'jpg';
    const personFileName = `person_${timestamp}.${personExt}`;
    const personPath = path.join(uploadDir, personFileName);
    const personBuffer = Buffer.from(await personImageFile.arrayBuffer());
    await writeFile(personPath, personBuffer);

    let resolvedGarmentPath: string;
    if (garmentImageFile) {
      const garmentExt = garmentImageFile.name.split('.').pop() || 'jpg';
      const garmentFileName = `garment_${timestamp}.${garmentExt}`;
      resolvedGarmentPath = path.join(uploadDir, garmentFileName);
      const garmentBuffer = Buffer.from(await garmentImageFile.arrayBuffer());
      await writeFile(resolvedGarmentPath, garmentBuffer);
    } else {
      // Use existing garment image from product assets — sanitize path
      const safePath = path.normalize(garmentImagePath!).replace(/^(\.\.(\/|\\|$))+/, '');
      if (safePath.includes('..') || path.isAbsolute(safePath)) {
        return NextResponse.json({ success: false, error: 'Invalid garment image path' }, { status: 400 });
      }
      const allowedPrefixes = ['/uploads/', '/demo-assets/'];
      if (!allowedPrefixes.some(p => safePath.startsWith(p))) {
        return NextResponse.json({ success: false, error: 'Garment path must be under /uploads/ or /demo-assets/' }, { status: 400 });
      }
      resolvedGarmentPath = path.join(process.cwd(), 'public', safePath);
    }

    const job = await createTryOnJob({
      companyId,
      experienceId: experienceId || undefined,
      personImagePath: personPath,
      garmentImagePath: resolvedGarmentPath,
    });

    return NextResponse.json({ success: true, data: { id: job.id, status: job.status } }, { status: 201 });
  } catch (error) {
    console.error('TryOnJob creation error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

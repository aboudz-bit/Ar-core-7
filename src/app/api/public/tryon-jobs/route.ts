import { NextRequest, NextResponse } from 'next/server';
import { createTryOnJob } from '@/services/virtual-tryon/clothing-tryon';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const companyId = formData.get('companyId') as string;
    const experienceId = formData.get('experienceId') as string | null;
    const personImageFile = formData.get('personImage') as File | null;
    const garmentImageFile = formData.get('garmentImage') as File | null;
    const garmentImagePath = formData.get('garmentImagePath') as string | null;
    const heightCmRaw = formData.get('heightCm') as string | null;
    const weightKgRaw = formData.get('weightKg') as string | null;
    const usualSize = formData.get('usualSize') as string | null;

    if (!companyId) {
      return NextResponse.json({ success: false, error: 'companyId is required' }, { status: 400 });
    }

    if (!personImageFile) {
      return NextResponse.json({ success: false, error: 'Person image is required' }, { status: 400 });
    }

    if (!garmentImageFile && !garmentImagePath) {
      return NextResponse.json({ success: false, error: 'Garment image is required' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(personImageFile.type)) {
      return NextResponse.json({ success: false, error: 'Invalid person image type' }, { status: 400 });
    }
    if (garmentImageFile && !allowedTypes.includes(garmentImageFile.type)) {
      return NextResponse.json({ success: false, error: 'Invalid garment image type' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'tryon', companyId);
    await mkdir(uploadDir, { recursive: true });

    const timestamp = Date.now();
    const personExt = personImageFile.name.split('.').pop() || 'jpg';
    const personFileName = `person_${timestamp}.${personExt}`;
    const personFilePath = path.join(uploadDir, personFileName);
    const personBuffer = Buffer.from(await personImageFile.arrayBuffer());
    await writeFile(personFilePath, personBuffer);

    let resolvedGarmentPath: string;
    if (garmentImageFile) {
      const garmentExt = garmentImageFile.name.split('.').pop() || 'jpg';
      const garmentFileName = `garment_${timestamp}.${garmentExt}`;
      resolvedGarmentPath = path.join(uploadDir, garmentFileName);
      const garmentBuffer = Buffer.from(await garmentImageFile.arrayBuffer());
      await writeFile(resolvedGarmentPath, garmentBuffer);
    } else {
      const safePath = path.normalize(garmentImagePath!).replace(/^(\.\.(\/|\\|$))+/, '');
      if (safePath.includes('..') || path.isAbsolute(safePath)) {
        return NextResponse.json({ success: false, error: 'Invalid garment image path' }, { status: 400 });
      }
      const allowedPrefixes = ['/uploads/', '/demo-assets/'];
      if (!allowedPrefixes.some(p => garmentImagePath!.startsWith(p))) {
        return NextResponse.json({ success: false, error: 'Garment path must be under /uploads/ or /demo-assets/' }, { status: 400 });
      }
      resolvedGarmentPath = path.join(process.cwd(), 'public', safePath);
    }

    // Build optional body profile from user inputs
    const heightCm = heightCmRaw ? parseFloat(heightCmRaw) : null;
    const weightKg = weightKgRaw ? parseFloat(weightKgRaw) : null;
    const bodyProfile = heightCm && weightKg && heightCm > 50 && heightCm < 300 && weightKg > 20 && weightKg < 500
      ? { heightCm, weightKg, ...(usualSize ? { usualSize } : {}) }
      : undefined;

    const job = await createTryOnJob({
      companyId,
      experienceId: experienceId || undefined,
      personImagePath: personFilePath,
      garmentImagePath: resolvedGarmentPath,
      bodyProfile,
    });

    return NextResponse.json({ success: true, data: { id: job.id, status: job.status } }, { status: 201 });
  } catch (error) {
    console.error('Public TryOnJob creation error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

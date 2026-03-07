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
    const bodyLandmarksRaw = formData.get('bodyLandmarks') as string | null;
    const garmentCategory = formData.get('garmentCategory') as string | null;
    const fitType = formData.get('fitType') as string | null;
    const drapeFactorRaw = formData.get('drapeFactor') as string | null;
    const sizeChartRaw = formData.get('sizeChart') as string | null;
    const garmentLengthRaw = formData.get('garmentLength') as string | null;
    const sleeveLengthRaw = formData.get('sleeveLength') as string | null;
    const shoulderSpecRaw = formData.get('shoulderSpec') as string | null;
    const chestSpecRaw = formData.get('chestSpec') as string | null;
    const sizingSystem = formData.get('sizingSystem') as string | null;

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
      if (!allowedPrefixes.some(p => safePath.startsWith(p))) {
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

    let bodyLandmarks: Array<{ x: number; y: number; z: number; visibility: number }> | undefined;
    if (bodyLandmarksRaw) {
      try {
        const parsed = JSON.parse(bodyLandmarksRaw);
        if (Array.isArray(parsed) && parsed.length >= 25) {
          bodyLandmarks = parsed;
        }
      } catch {
        // Invalid JSON — ignore
      }
    }

    const validCategories = ['t-shirt', 'shirt', 'jacket', 'hoodie', 'sweater', 'thobe', 'abaya', 'dress', 'polo', 'other'];
    const validFitTypes = ['slim', 'regular', 'oversized', 'loose'];
    const validSizingSystems = ['letter', 'numeric', 'custom'];
    const parsedDrapeFactor = drapeFactorRaw ? parseFloat(drapeFactorRaw) : undefined;
    const drapeFactor = parsedDrapeFactor && !isNaN(parsedDrapeFactor) && parsedDrapeFactor >= 0.5 && parsedDrapeFactor <= 2.0
      ? parsedDrapeFactor : undefined;

    let sizeChart: Record<string, Record<string, number | undefined>> | undefined;
    if (sizeChartRaw) {
      try {
        const parsed = JSON.parse(sizeChartRaw);
        if (typeof parsed === 'object' && parsed !== null && Object.keys(parsed).length > 0) {
          const normalized: Record<string, Record<string, number | undefined>> = {};
          for (const [sizeLabel, entry] of Object.entries(parsed)) {
            if (typeof entry === 'object' && entry !== null) {
              const normEntry: Record<string, number | undefined> = {};
              for (const [field, val] of Object.entries(entry as Record<string, unknown>)) {
                const num = typeof val === 'number' ? val : typeof val === 'string' ? parseFloat(val) : NaN;
                if (!isNaN(num) && num > 0) normEntry[field] = num;
              }
              if (Object.keys(normEntry).length > 0) normalized[String(sizeLabel)] = normEntry;
            }
          }
          if (Object.keys(normalized).length > 0) sizeChart = normalized;
        }
      } catch {
      }
    }

    const parseSpec = (raw: string | null): number | undefined => {
      if (!raw) return undefined;
      const val = parseFloat(raw);
      return !isNaN(val) && val > 0 && val < 500 ? val : undefined;
    };

    const job = await createTryOnJob({
      companyId,
      experienceId: experienceId || undefined,
      personImagePath: personFilePath,
      garmentImagePath: resolvedGarmentPath,
      bodyProfile,
      bodyLandmarks,
      garmentCategory: garmentCategory && validCategories.includes(garmentCategory) ? garmentCategory : undefined,
      fitType: fitType && validFitTypes.includes(fitType) ? fitType : undefined,
      drapeFactor,
      sizeChart,
      garmentLength: parseSpec(garmentLengthRaw),
      sleeveLength: parseSpec(sleeveLengthRaw),
      shoulderSpec: parseSpec(shoulderSpecRaw),
      chestSpec: parseSpec(chestSpecRaw),
      sizingSystem: sizingSystem && validSizingSystems.includes(sizingSystem) ? sizingSystem : undefined,
    });

    return NextResponse.json({ success: true, data: { id: job.id, status: job.status } }, { status: 201 });
  } catch (error) {
    console.error('Public TryOnJob creation error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSession, isSuperAdmin } from '@/lib/auth';
import { createMerchantProduct, listMerchantProducts } from '@/services/merchant/merchant-products';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';

export const dynamic = 'force-dynamic';

/**
 * GET /api/merchant/products — List merchant products for the user's company.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');

  const targetCompanyId = companyId || session.memberships[0]?.companyId;
  if (!targetCompanyId) {
    return NextResponse.json({ success: false, error: 'No company found' }, { status: 400 });
  }

  // Validate access
  if (!isSuperAdmin(session) && !session.memberships.some((m) => m.companyId === targetCompanyId)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const products = await listMerchantProducts(targetCompanyId);
  return NextResponse.json({ success: true, data: products });
}

/**
 * POST /api/merchant/products — Create a new merchant product with garment image upload.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await req.formData();
    const companyId = formData.get('companyId') as string;
    const title = formData.get('title') as string;
    const category = formData.get('category') as string;
    const garmentImageFile = formData.get('garmentImage') as File | null;

    if (!companyId || !title || !category) {
      return NextResponse.json({ success: false, error: 'companyId, title, and category are required' }, { status: 400 });
    }

    // Tenant check
    if (!isSuperAdmin(session) && !session.memberships.some((m) => m.companyId === companyId)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    if (!garmentImageFile) {
      return NextResponse.json({ success: false, error: 'Garment image is required' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(garmentImageFile.type)) {
      return NextResponse.json({ success: false, error: 'Invalid image type. Use JPEG, PNG, or WebP.' }, { status: 400 });
    }

    // Save garment image
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'merchant', companyId);
    await mkdir(uploadDir, { recursive: true });

    const timestamp = Date.now();
    const ext = garmentImageFile.name.split('.').pop() || 'jpg';
    const fileName = `garment_${timestamp}.${ext}`;
    const filePath = path.join(uploadDir, fileName);
    const buffer = Buffer.from(await garmentImageFile.arrayBuffer());
    await writeFile(filePath, buffer);

    const garmentImagePath = `/uploads/merchant/${companyId}/${fileName}`;

    const product = await createMerchantProduct({
      companyId,
      title,
      garmentImagePath,
      category,
      thumbnailUrl: garmentImagePath,
    });

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Merchant product creation error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

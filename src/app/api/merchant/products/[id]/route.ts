import { NextRequest, NextResponse } from 'next/server';
import { getSession, isSuperAdmin } from '@/lib/auth';
import { getMerchantProduct, updateMerchantProduct } from '@/services/merchant/merchant-products';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';

export const dynamic = 'force-dynamic';

/**
 * GET /api/merchant/products/:id — Get a single merchant product.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const companyId = new URL(req.url).searchParams.get('companyId') || session.memberships[0]?.companyId;
  if (!companyId) {
    return NextResponse.json({ success: false, error: 'No company found' }, { status: 400 });
  }

  if (!isSuperAdmin(session) && !session.memberships.some((m) => m.companyId === companyId)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const product = await getMerchantProduct(params.id, companyId);
  if (!product) {
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: product });
}

/**
 * PUT /api/merchant/products/:id — Update a merchant product.
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const contentType = req.headers.get('content-type') || '';
    let companyId: string;
    let updateData: Record<string, unknown> = {};

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      companyId = (formData.get('companyId') as string) || session.memberships[0]?.companyId;

      // Extract text fields
      const fields = ['title', 'category', 'fitType', 'sizingSystem', 'drapeFactor',
        'garmentLength', 'sleeveLength', 'shoulderSpec', 'chestSpec', 'sizeChart'] as const;

      for (const field of fields) {
        const val = formData.get(field) as string | null;
        if (val === null) continue;

        if (field === 'sizeChart') {
          try { updateData[field] = JSON.parse(val); } catch { /* skip invalid JSON */ }
        } else if (['drapeFactor', 'garmentLength', 'sleeveLength', 'shoulderSpec', 'chestSpec'].includes(field)) {
          const num = parseFloat(val);
          if (!isNaN(num)) updateData[field] = num;
          else if (val === '') updateData[field] = null;
        } else {
          updateData[field] = val;
        }
      }

      // Handle garment image replacement
      const garmentImageFile = formData.get('garmentImage') as File | null;
      if (garmentImageFile && garmentImageFile.size > 0) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(garmentImageFile.type)) {
          return NextResponse.json({ success: false, error: 'Invalid image type' }, { status: 400 });
        }
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'merchant', companyId);
        await mkdir(uploadDir, { recursive: true });
        const timestamp = Date.now();
        const ext = garmentImageFile.name.split('.').pop() || 'jpg';
        const fileName = `garment_${timestamp}.${ext}`;
        const filePath = path.join(uploadDir, fileName);
        await writeFile(filePath, Buffer.from(await garmentImageFile.arrayBuffer()));
        const garmentImagePath = `/uploads/merchant/${companyId}/${fileName}`;
        updateData.garmentImagePath = garmentImagePath;
        updateData.thumbnailUrl = garmentImagePath;
      }
    } else {
      const body = await req.json();
      companyId = body.companyId || session.memberships[0]?.companyId;
      updateData = body;
      // Strip fields that must not be set via JSON body
      delete updateData.companyId;
      delete updateData.id;
      delete updateData.garmentImagePath;
      delete updateData.thumbnailUrl;
      delete updateData.createdAt;
      delete updateData.updatedAt;
    }

    if (!companyId) {
      return NextResponse.json({ success: false, error: 'No company found' }, { status: 400 });
    }

    if (!isSuperAdmin(session) && !session.memberships.some((m) => m.companyId === companyId)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const product = await updateMerchantProduct(params.id, companyId, updateData);
    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Merchant product update error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

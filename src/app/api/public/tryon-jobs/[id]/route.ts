import { NextRequest, NextResponse } from 'next/server';
import { getTryOnJobStatus } from '@/services/virtual-tryon/clothing-tryon';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const result = await getTryOnJobStatus(params.id);
  if (!result) {
    return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: result });
}

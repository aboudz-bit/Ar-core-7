import { prisma } from '@/lib/prisma';
import QRCode from 'qrcode';

/**
 * Generate or retrieve a cached QR code for a target URL.
 * Returns base64 PNG image data.
 */
export async function getOrGenerateQR(
  targetUrl: string,
  experienceId?: string,
  size: number = 300
): Promise<string> {
  // Check cache
  const cached = await prisma.qRCode.findUnique({
    where: { targetUrl },
  });

  if (cached && cached.size === size) {
    return cached.imageData;
  }

  // Generate new QR code
  const imageData = await QRCode.toDataURL(targetUrl, {
    width: size,
    margin: 2,
    color: { dark: '#212529', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  });

  // Cache it
  await prisma.qRCode.upsert({
    where: { targetUrl },
    create: {
      experienceId: experienceId || null,
      targetUrl,
      imageData,
      size,
      format: 'png',
    },
    update: {
      imageData,
      size,
    },
  });

  return imageData;
}

/**
 * Auto-generate QR code when an experience is published.
 */
export async function generateQRForExperience(experienceSlug: string, experienceId: string): Promise<string> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
  const targetUrl = `${appUrl}/launch/${experienceSlug}`;
  return getOrGenerateQR(targetUrl, experienceId);
}

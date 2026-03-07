'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, Download, ExternalLink, Smartphone } from 'lucide-react';

interface Props {
  experience: { name: string; type: string };
  company: { name: string; brandPrimary: string };
  arUrl: string;
  productTitle: string | null;
}

export function QrPageClient({ experience, company, arUrl, productTitle }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrReady, setQrReady] = useState(false);

  useEffect(() => {
    import('qrcode').then((QRCode) => {
      if (canvasRef.current) {
        QRCode.toCanvas(canvasRef.current, arUrl, {
          width: 280,
          margin: 2,
          color: { dark: '#212529', light: '#ffffff' },
        });
        setQrReady(true);
      }
    });
  }, [arUrl]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-${experience.name.replace(/\s+/g, '-').toLowerCase()}.png`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface-50 to-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: company.brandPrimary + '15' }}>
            <Box className="w-7 h-7" style={{ color: company.brandPrimary }} />
          </div>
          <h1 className="text-2xl font-bold text-surface-900 mb-1">{experience.name}</h1>
          <p className="text-sm text-surface-500">{company.name}</p>
          {productTitle && <p className="text-xs text-surface-400 mt-1">{productTitle}</p>}
        </div>

        <div className="card p-6 flex flex-col items-center">
          <canvas ref={canvasRef} className="rounded-xl" />
          <p className="text-xs text-surface-400 mt-4">Scan to launch AR experience</p>

          <div className="w-full space-y-3 mt-6">
            <a
              href={arUrl}
              target="_blank"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-semibold text-sm"
              style={{ backgroundColor: company.brandPrimary }}
            >
              <Smartphone className="w-4 h-4" />
              Open AR Experience
            </a>

            {qrReady && (
              <button onClick={handleDownload} className="btn-secondary w-full">
                <Download className="w-4 h-4" />
                Download QR Code
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-[10px] text-surface-300">Powered by AR-core-7</p>
        </div>
      </div>
    </div>
  );
}

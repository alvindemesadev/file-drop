'use client';

import { useCallback, useEffect, useRef } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  url: string;
}

export default function QRCodeDisplay({ url }: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 200,
        margin: 2,
        color: { dark: '#000', light: '#fff' },
      });
    }
  }, [url]);

  const handleDownload = useCallback(async () => {
    const canvas = document.createElement('canvas');
    await QRCode.toCanvas(canvas, url, {
      width: 400,
      margin: 2,
      color: { dark: '#000', light: '#fff' },
    });
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'qr-code.png';
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }, [url]);

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas ref={canvasRef} className="rounded-lg" />
      <Button variant="outline" size="sm" onClick={handleDownload}>
        <Download className="size-4" /> Download QR
      </Button>
    </div>
  );
}

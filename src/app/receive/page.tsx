'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowRight, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import jsQR from 'jsqr';

function extractIdFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const match = u.pathname.match(/^\/download\/(.+)$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

async function decodeImageFile(file: File): Promise<string | null> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return jsQR(imageData.data, imageData.width, imageData.height)?.data ?? null;
}

export default function ReceivePage() {
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [qrError, setQrError] = useState('');
  const [decodingFile, setDecodingFile] = useState(false);
  const router = useRouter();

  const lookupRedirect = async (id: string) => {
    const res = await fetch(`/api/files/${id}/check`);
    if (!res.ok) {
      const data = await res.json();
      return data.error || 'File not found';
    }
    router.push(`/download/${id}`);
    return null;
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setCodeError('Enter a valid 6-digit code');
      return;
    }
    setCodeLoading(true);
    setCodeError('');
    try {
      const res = await fetch(`/api/code/${trimmed}`);
      const data = await res.json();
      if (!data.found) {
        const msg = data.error || 'No file found with this code';
        setCodeError(msg);
        toast.error(msg);
        setCodeLoading(false);
        return;
      }
      toast.success('Found file — redirecting...');
      router.push(`/download/${data.id}`);
    } catch {
      setCodeError('Something went wrong');
      toast.error('Something went wrong');
      setCodeLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDecodingFile(true);
    setQrError('');
    try {
      const data = await decodeImageFile(file);
      if (!data) {
        setQrError('No QR code found in this image');
        toast.error('No QR code found in this image');
        return;
      }
      const id = extractIdFromUrl(data);
      if (!id) {
        setQrError('QR decoded — not a FileDrop link');
        toast.error('QR decoded — not a FileDrop link');
        return;
      }
      const err = await lookupRedirect(id);
      if (err) {
        setQrError(err);
        toast.error(err);
      } else {
        toast.success('QR decoded — redirecting...');
      }
    } catch {
      setQrError('Failed to decode image');
      toast.error('Failed to decode image');
    } finally {
      setDecodingFile(false);
      e.target.value = '';
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-12 space-y-6">
      <div className="text-center mb-2">
        <h1 className="text-3xl font-bold tracking-tight">Receive Files</h1>
        <p className="text-muted-foreground mt-2">
          Enter a code or upload a QR screenshot to download files
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-center">Enter Code</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <div className="flex flex-col items-center gap-2">
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setCode(val);
                  setCodeError('');
                }}
                className="text-center text-2xl tracking-[0.5em] font-mono h-12"
                autoFocus
              />
            </div>
            {codeError && (
              <p className="text-sm text-destructive text-center">{codeError}</p>
            )}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={code.length !== 6 || codeLoading}
            >
              {codeLoading ? <><Loader2 className="size-4 animate-spin" /> Looking up...</> : (
                <><ArrowRight className="size-4" /> Download</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">OR</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-center">Scan QR Code</CardTitle>
        </CardHeader>
        <CardContent>
          <Label className="flex flex-col items-center gap-2 w-full border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-muted-foreground transition-colors">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
              disabled={decodingFile}
            />
            <Upload className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {decodingFile ? 'Decoding...' : 'Upload a QR screenshot'}
            </p>
          </Label>
          {qrError && (
            <p className="text-sm text-destructive text-center mt-4">{qrError}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

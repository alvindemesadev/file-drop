'use client';

import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Check, Copy, ArrowLeft, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useCountdown } from '@/lib/hooks';
import QRCodeDisplay from './QRCodeDisplay';

interface ShareCardProps {
  downloadUrl: string;
  fileName: string;
  fileSize: number;
  fileCount?: number;
  hasPassword?: boolean;
  isZip?: boolean;
  expiresAt?: string;
  accessCode?: string;
  onReset: () => void;
}

export default function ShareCard({ downloadUrl, fileName, fileSize, fileCount, hasPassword, isZip, expiresAt, accessCode, onReset }: ShareCardProps) {
  const [copied, setCopied] = useState(false);
  const [copyFallback, setCopyFallback] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  const expiresIn = useCountdown(expiresAt);

  const handleCopy = () => {
    const input = inputRef.current;
    if (!input) return;
    input.select();
    input.setSelectionRange(0, 99999);
    try {
      document.execCommand('copy');
      setCopied(true);
      toast.success('Link copied to clipboard');
    } catch {
      setCopyFallback(true);
      toast.error('Could not copy — select manually');
    }
    setTimeout(() => { setCopied(false); setCopyFallback(false); }, 2000);
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <div className="flex flex-col items-center text-center gap-2">
          <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mb-1">
            <Check className="size-6 text-primary" />
          </div>
          <CardTitle>File uploaded!</CardTitle>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <p className="text-sm text-muted-foreground">
              {fileCount && fileCount > 1 ? `${fileCount} files` : fileName}
            </p>
            {isZip && <Badge variant="secondary">ZIP</Badge>}
            {hasPassword && <Badge variant="outline"><Lock className="size-3" /> Protected</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">
            {(fileSize / 1024 / 1024).toFixed(2)} MB
            {expiresIn && ` · ${expiresIn}`}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Input ref={inputRef} type="text" readOnly value={downloadUrl} className="flex-1" />
          <Button onClick={handleCopy} variant="outline" className="shrink-0">
            {copied ? <><Check className="size-4" /> Copied</> : <><Copy className="size-4" /> Copy</>}
          </Button>
        </div>
        {copyFallback && (
          <p className="text-xs text-amber-600 text-center">
            Copy manually — select the link above and press Ctrl+C
          </p>
        )}
        {accessCode && (
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Or share this code:</p>
            <p className="text-3xl font-mono tracking-[0.3em] font-bold">{accessCode}</p>
          </div>
        )}
        <div className="flex justify-center">
          <QRCodeDisplay url={downloadUrl} />
        </div>
      </CardContent>
      <CardFooter className="justify-center">
        <Button variant="ghost" size="sm" onClick={onReset}>
          <ArrowLeft className="size-4" /> Upload another file
        </Button>
      </CardFooter>
    </Card>
  );
}

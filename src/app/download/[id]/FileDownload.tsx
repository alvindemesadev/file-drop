'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Download, FileX, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useCountdown } from '@/lib/hooks';

interface FileInfo {
  error?: string;
  needsPassword?: boolean;
}

export default function FileDownload({ id }: { id: string }) {
  const [info, setInfo] = useState<FileInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [expiresAt, setExpiresAt] = useState<string | undefined>();
  const [fileCount, setFileCount] = useState(1);
  const [hasPassword, setHasPassword] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    fetch(`/api/files/${id}/check`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'File not found');
        }
        const data = await res.json();
        setFileName(data.fileName);
        setFileSize(data.fileSize);
        setExpiresAt(data.expiresAt);
        setFileCount(data.fileCount);
        if (data.hasPassword) {
          setHasPassword(true);
          setInfo({ needsPassword: true });
        } else {
          setAuthenticated(true);
          setInfo({});
        }
      })
      .catch((err) => {
        setInfo({ error: err.message });
        toast.error(err.message);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    const res = await fetch(`/api/files/${id}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();

    if (data.valid) {
      setAuthenticated(true);
      setInfo({});
      toast.success('Password correct');
    } else {
      const msg = data.error || 'Invalid password';
      setPasswordError(msg);
      toast.error(msg);
    }
  };

  const expiresIn = useCountdown(expiresAt);

  const handleDownload = async () => {
    try {
      const res = await fetch(`/api/files/${id}`, {
        headers: hasPassword ? { 'x-password': password } : undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data.error || 'Download failed';
        toast.error(msg);
        if (res.status === 401 || res.status === 403) {
          setAuthenticated(false);
          setInfo({ needsPassword: true });
        }
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-12">
      {loading && (
        <Card className="text-center">
          <CardHeader>
            <div className="flex flex-col items-center gap-2">
              <CardTitle>Loading...</CardTitle>
            </div>
          </CardHeader>
        </Card>
      )}

      {!loading && info?.error && (
        <Card className="text-center">
          <CardHeader>
            <div className="flex flex-col items-center gap-2">
              <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <FileX className="size-8 text-destructive" />
              </div>
              <CardTitle>File not found</CardTitle>
              <p className="text-sm text-muted-foreground">
                This link may be invalid or the file has expired.
              </p>
            </div>
          </CardHeader>
        </Card>
      )}

      {!loading && info?.needsPassword && !authenticated && (
        <Card className="text-center">
          <CardHeader>
            <div className="flex flex-col items-center gap-2">
              <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Lock className="size-8 text-primary" />
              </div>
              <CardTitle>Password required</CardTitle>
              <p className="text-sm text-muted-foreground">
                This file is protected. Enter the password to download.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {passwordError && (
                <p className="text-sm text-destructive">{passwordError}</p>
              )}
              <Button type="submit" className="w-full" disabled={!password}>
                <Lock className="size-4" /> Unlock
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {!loading && !info?.error && !(info?.needsPassword && !authenticated) && (
        <Card className="text-center">
          <CardHeader>
            <div className="flex flex-col items-center gap-2">
              <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Download className="size-8 text-primary" />
              </div>
              <CardTitle>{fileName}</CardTitle>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  {(fileSize / 1024 / 1024).toFixed(2)} MB
                </p>
                {fileCount > 1 && <Badge variant="secondary">{fileCount} files</Badge>}
                {hasPassword && <Badge variant="outline"><Lock className="size-3" /> Protected</Badge>}
              </div>
              {expiresIn && (
                <p className="text-xs text-muted-foreground">
                  {expiresIn}
                </p>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Button className="w-full" size="lg" onClick={handleDownload}>
              <Download className="size-4" /> Download File
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

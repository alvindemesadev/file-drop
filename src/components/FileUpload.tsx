'use client';

import { useCallback, useState, useRef } from 'react';
import { toast } from 'sonner';
import { Upload, File, X, GripVertical, ChevronUp, ChevronDown, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ShareCard from './ShareCard';
import { MAX_FILE_SIZE } from '@/lib/limits';

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

const expiryLabels: Record<string, string> = {
  '1': '1 hour',
  '6': '6 hours',
  '24': '24 hours',
  '72': '3 days',
  '168': '7 days',
};

interface FileItem {
  id: string;
  file: File;
}

export default function FileUpload() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState('');
  const [eta, setEta] = useState('');
  const [result, setResult] = useState<{
    downloadUrl: string;
    fileName: string;
    fileSize: number;
    fileCount?: number;
    hasPassword?: boolean;
    isZip?: boolean;
    expiresAt?: string;
    accessCode?: string;
  } | null>(null);
  const [expiryHours, setExpiryHours] = useState('24');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef(0);

  const addFiles = useCallback((list: FileList) => {
    setResult(null);
    setError('');
    const incoming = Array.from(list);
    const oversized = incoming.find((f) => f.size > MAX_FILE_SIZE);
    if (oversized) {
      setError(`"${oversized.name}" exceeds the 1GB limit`);
      toast.error(`"${oversized.name}" exceeds the 1GB limit`);
      return;
    }
    setFiles((prev) => [
      ...prev,
      ...incoming.map((file) => ({ id: crypto.randomUUID(), file })),
    ]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const moveFile = useCallback((from: number, to: number) => {
    setFiles((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleUpload = () => {
    if (!files.length) return;
    setUploading(true);
    setProgress(0);
    setSpeed('');
    setEta('');
    setError('');
    startTimeRef.current = Date.now();

    const formData = new FormData();
    formData.append('expiryHours', expiryHours);
    if (password) formData.append('password', password);
    for (const { file: f } of files) {
      formData.append('files', f);
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100));
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        if (elapsed > 0.5) {
          const bytesPerSec = e.loaded / elapsed;
          setSpeed(bytesPerSec >= 1024 * 1024
            ? `${(bytesPerSec / 1024 / 1024).toFixed(1)} MB/s`
            : `${(bytesPerSec / 1024).toFixed(0)} KB/s`);
          const remainingSec = (e.total - e.loaded) / bytesPerSec;
          setEta(remainingSec >= 60
            ? `${Math.ceil(remainingSec / 60)}m ${Math.ceil(remainingSec % 60)}s`
            : `${Math.ceil(remainingSec)}s`);
        }
      }
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 400) throw new Error(data.error || 'Upload failed');
        setResult({ ...data, expiresAt: data.expiresAt });
        setFiles([]);
        setPassword('');
        toast.success('Files uploaded successfully');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        setError(msg);
        toast.error(msg);
      } finally {
        setUploading(false);
      }
    };

    xhr.onerror = () => {
      setError('Network error');
      setUploading(false);
      toast.error('Network error — check your connection');
    };

    xhr.send(formData);
  };

  if (result) {
    return <ShareCard {...result} onReset={() => setResult(null)} />;
  }

  const totalSize = files.reduce((s, f) => s + f.file.size, 0);

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4">
        <form onSubmit={(e) => { e.preventDefault(); handleUpload(); }} className="flex flex-col items-center gap-4 w-full">
        <Label
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`w-full border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors flex flex-col items-center gap-2 ${
            files.length === 0 ? 'p-12' : 'p-4'
          } ${
            dragOver
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-muted-foreground'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files);
            }}
          />
          <Upload className={`${files.length === 0 ? 'size-10' : 'size-6'} text-muted-foreground`} />
          <p className="text-sm text-muted-foreground">
            {files.length === 0
              ? 'Tap to browse or drop files here'
              : 'Tap or drop to add more files'}
          </p>
        </Label>

        {files.length > 0 && (
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-muted-foreground">
                {files.length} file{files.length > 1 ? 's' : ''} ({formatSize(totalSize)})
              </p>
              <Button type="button" variant="ghost" size="xs" onClick={() => setFiles([])}>
                Clear all
              </Button>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {files.map((item, i) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => setDragIdx(i)}
                  onDragOver={(e) => { e.preventDefault(); }}
                  onDrop={(e) => { e.preventDefault(); if (dragIdx !== null && dragIdx !== i) moveFile(dragIdx, i); setDragIdx(null); }}
                  className="flex items-center gap-2 bg-muted/50 rounded-lg px-2 py-2 group cursor-grab active:cursor-grabbing"
                >
                  <div className="flex flex-col shrink-0">
                    <button type="button" onClick={() => i > 0 && moveFile(i, i - 1)} className="text-muted-foreground/50 hover:text-foreground -mb-1" aria-label="Move up">
                      <ChevronUp className="size-3.5" />
                    </button>
                    <button type="button" onClick={() => i < files.length - 1 && moveFile(i, i + 1)} className="text-muted-foreground/50 hover:text-foreground -mt-1" aria-label="Move down">
                      <ChevronDown className="size-3.5" />
                    </button>
                  </div>
                  <GripVertical className="size-4 shrink-0 text-muted-foreground/30 hidden sm:block" />
                  <File className="size-5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{item.file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatSize(item.file.size)}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => removeFile(i)}
                    className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {files.length > 0 && (
          <div className="w-full space-y-3">
            <div className="flex items-center justify-between px-1">
              <Label className="text-xs text-muted-foreground">Expiry:</Label>
              <Select value={expiryHours} onValueChange={(v) => v && setExpiryHours(v)}>
                <SelectTrigger className="w-28">
                  <SelectValue>{expiryLabels[expiryHours] || expiryHours}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hour</SelectItem>
                  <SelectItem value="6">6 hours</SelectItem>
                  <SelectItem value="24">24 hours</SelectItem>
                  <SelectItem value="72">3 days</SelectItem>
                  <SelectItem value="168">7 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 px-1">
              <Lock className="size-4 text-muted-foreground shrink-0" />
              <div className="relative flex-1">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password (optional)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pr-8"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground px-1">
              Files are zipped before download
            </p>
          </div>
        )}

        {uploading && (
          <div className="w-full space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Uploading...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-200 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            {(speed || eta) && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{speed}</span>
                <span>ETA: {eta}</span>
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="text-destructive text-sm">{error}</p>
        )}

        <Button
          type="submit"
          disabled={!files.length || uploading}
          className="w-full"
          size="lg"
        >
          {uploading
            ? `Uploading ${progress}%`
            : files.length > 1
              ? `Upload ${files.length} files`
              : 'Upload File'}
        </Button>
        </form>
      </CardContent>
    </Card>
  );
}

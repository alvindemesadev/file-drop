import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { ZipArchive } from 'archiver';
import { saveFileRecord, generateAccessCode, MAX_FILE_SIZE, MAX_UPLOAD_SIZE } from '@/lib/store';

export const runtime = 'nodejs';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

function guessMime(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
    webp: 'image/webp', svg: 'image/svg+xml', pdf: 'application/pdf',
    txt: 'text/plain', html: 'text/html', css: 'text/css',
    js: 'application/javascript', json: 'application/json',
    zip: 'application/zip', mp4: 'video/mp4', mp3: 'audio/mpeg',
  };
  return map[ext] || 'application/octet-stream';
}

export async function POST(request: NextRequest) {
  try {
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        { error: `Total upload size exceeds ${MAX_UPLOAD_SIZE / 1024 / 1024}MB limit` },
        { status: 413 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files.length) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    for (const f of files) {
      if (f.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `"${f.name}" exceeds the ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
          { status: 413 }
        );
      }
    }

    const id = crypto.randomUUID();
    const accessCode = generateAccessCode();
    const dir = path.join(UPLOAD_DIR, id);
    await fs.mkdir(dir, { recursive: true });

    const now = new Date();
    const expiryHours = parseInt(formData.get('expiryHours') as string) || 24;
    const expiresAt = new Date(now.getTime() + expiryHours * 60 * 60 * 1000);

    const password = formData.get('password') as string | null;
    const passwordHash = password ? crypto.createHash('sha256').update(password).digest('hex') : undefined;

    const fileBuffers = await Promise.all(
      files.map(async (f) => ({
        name: f.name,
        buffer: Buffer.from(await f.arrayBuffer()),
      }))
    );

    let fileName: string;
    let fileBuffer: Buffer;
    let mimeType: string;
    let isZip: boolean;

    if (fileBuffers.length === 1) {
      fileName = fileBuffers[0].name;
      fileBuffer = fileBuffers[0].buffer;
      mimeType = guessMime(fileName);
      isZip = false;
    } else {
      fileName = 'files.zip';
      mimeType = 'application/zip';
      isZip = true;
      fileBuffer = await new Promise<Buffer>((resolve, reject) => {
        const archive = new ZipArchive({ zlib: { level: 9 } });
        const chunks: Buffer[] = [];
        archive.on('data', (chunk) => chunks.push(chunk));
        archive.on('end', () => resolve(Buffer.concat(chunks)));
        archive.on('error', reject);
        for (const fb of fileBuffers) {
          archive.append(fb.buffer, { name: fb.name });
        }
        archive.finalize();
      });
    }

    await fs.writeFile(path.join(dir, fileName), fileBuffer);

    await saveFileRecord({
      id,
      accessCode,
      originalName: fileName,
      size: fileBuffer.length,
      mimeType,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      passwordHash,
      fileCount: files.length,
      isZip,
    });

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = `${protocol}://${host}`;
    const downloadUrl = `${baseUrl}/download/${id}`;
    return NextResponse.json({
      id,
      accessCode,
      downloadUrl,
      fileName,
      fileSize: fileBuffer.length,
      fileCount: files.length,
      hasPassword: !!password,
      isZip,
      expiresAt: expiresAt.toISOString(),
    });
  } catch {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

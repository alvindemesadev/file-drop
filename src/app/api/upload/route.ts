import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { ZipArchive } from 'archiver';
import { saveFileRecord, generateAccessCode, MAX_FILE_SIZE, MAX_UPLOAD_SIZE } from '@/lib/store';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

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

    const zipBuffer = await new Promise<Buffer>((resolve, reject) => {
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

    const fileName = fileBuffers.length === 1 ? fileBuffers[0].name : 'files.zip';
    await fs.writeFile(path.join(dir, fileName), zipBuffer);

    await saveFileRecord({
      id,
      accessCode,
      originalName: fileName,
      size: zipBuffer.length,
      mimeType: 'application/zip',
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      passwordHash,
      fileCount: files.length,
      isZip: true,
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
      fileSize: zipBuffer.length,
      fileCount: files.length,
      hasPassword: !!password,
      isZip: true,
      expiresAt: expiresAt.toISOString(),
    });
  } catch {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

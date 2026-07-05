import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { getFileRecord } from '@/lib/store';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const record = await getFileRecord(id);

  if (!record) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  if (new Date(record.expiresAt) < new Date()) {
    return NextResponse.json({ error: 'File has expired' }, { status: 410 });
  }

  const password = request.nextUrl.searchParams.get('password');
  if (record.passwordHash) {
    if (!password) {
      return NextResponse.json(
        { error: 'Password required', needsPassword: true },
        { status: 401 }
      );
    }
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    if (hash !== record.passwordHash) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 403 });
    }
  }

  const filePath = path.join(UPLOAD_DIR, id, record.originalName);

  try {
    await fsPromises.access(filePath);
  } catch {
    return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
  }

  const stat = await fsPromises.stat(filePath);
  const stream = fs.createReadStream(filePath);
  const webStream = new ReadableStream({
    start(controller) {
      stream.on('data', (chunk) => controller.enqueue(chunk));
      stream.on('end', () => controller.close());
      stream.on('error', (err) => controller.error(err));
    },
  });

  return new NextResponse(webStream, {
    headers: {
      'Content-Type': record.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${record.originalName}"`,
      'Content-Length': String(stat.size),
      'X-Expires-At': record.expiresAt,
      'X-File-Count': String(record.fileCount),
      'X-Has-Password': String(!!record.passwordHash),
    },
  });
}

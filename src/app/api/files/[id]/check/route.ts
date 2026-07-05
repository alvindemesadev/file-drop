import { NextRequest, NextResponse } from 'next/server';
import { getFileRecord } from '@/lib/store';

export async function GET(
  _request: NextRequest,
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

  return NextResponse.json({
    fileName: record.originalName,
    fileSize: record.size,
    fileCount: record.fileCount,
    hasPassword: !!record.passwordHash,
    expiresAt: record.expiresAt,
  });
}

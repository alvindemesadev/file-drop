import { NextRequest, NextResponse } from 'next/server';
import { getFileRecordByCode } from '@/lib/store';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ found: false, error: 'Invalid code format' });
    }

    const record = await getFileRecordByCode(code);

    if (!record) {
      return NextResponse.json({ found: false, error: 'No file found with this code' });
    }

    if (new Date(record.expiresAt) < new Date()) {
      return NextResponse.json({ found: false, error: 'This file has expired' });
    }

    return NextResponse.json({
      found: true,
      id: record.id,
      fileName: record.originalName,
      fileSize: record.size,
      fileCount: record.fileCount,
      hasPassword: !!record.passwordHash,
      expiresAt: record.expiresAt,
    });
  } catch {
    return NextResponse.json({ found: false, error: 'Something went wrong' });
  }
}

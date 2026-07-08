import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getFileRecord } from '@/lib/store';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const record = await getFileRecord(id);

  if (!record) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const password = (body.password as string) ?? '';

  if (record.passwordHash) {
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    if (hash !== record.passwordHash) {
      return NextResponse.json({ valid: false, error: 'Invalid password' });
    }
  }

  return NextResponse.json({ valid: true });
}

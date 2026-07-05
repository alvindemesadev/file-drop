import { NextResponse } from 'next/server';
import { deleteExpiredFiles } from '@/lib/store';

export async function GET() {
  try {
    const deleted = await deleteExpiredFiles();
    return NextResponse.json({ deleted });
  } catch {
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}

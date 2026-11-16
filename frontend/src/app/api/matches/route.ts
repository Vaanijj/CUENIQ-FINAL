import { NextResponse } from 'next/server';
import { db } from '@/lib/serverDb';

export const dynamic = 'force-dynamic';

export async function GET() {
  const matches = db.listMatches();
  return NextResponse.json({
    matches,
    total: matches.length,
  });
}

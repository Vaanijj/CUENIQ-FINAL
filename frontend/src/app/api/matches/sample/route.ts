import { NextResponse } from 'next/server';
import { getSampleAnalysis } from '@/lib/serverDb';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(getSampleAnalysis());
}

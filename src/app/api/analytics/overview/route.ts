import { NextResponse } from 'next/server';
import { computeAnalyticsOverview } from '@/lib/serverDb';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const includeSample = searchParams.get('include_sample') === 'true';
  return NextResponse.json(computeAnalyticsOverview(includeSample));
}

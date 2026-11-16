import { NextResponse } from 'next/server';
import { db } from '@/lib/serverDb';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const analysis = db.getMatchAnalysis(params.id);
  if (!analysis) {
    return NextResponse.json({ detail: 'Match not found' }, { status: 404 });
  }
  return NextResponse.json(analysis);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  db.deleteMatch(params.id);
  return NextResponse.json({ status: 'deleted', id: params.id });
}

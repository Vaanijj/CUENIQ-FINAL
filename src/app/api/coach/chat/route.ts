import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { generateCoachReply } from '@/lib/serverDb';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body.message || '';
    const matchId = body.match_id || null;
    const shotNumber = body.shot_number ?? null;

    const reply = generateCoachReply(message, matchId, shotNumber);
    const now = new Date().toISOString();

    return NextResponse.json([
      {
        id: crypto.randomUUID(),
        role: 'user',
        content: message,
        created_at: now,
      },
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: reply,
        created_at: now,
      },
    ]);
  } catch (err: any) {
    return NextResponse.json(
      { detail: err?.message || 'Coach request failed' },
      { status: 500 }
    );
  }
}

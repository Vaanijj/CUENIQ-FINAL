import { NextResponse } from 'next/server';
import { db, verifyJwt } from '@/lib/serverDb';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ detail: 'Not authenticated' }, { status: 401 });
  }
  const token = authHeader.slice(7).trim();
  const claims = verifyJwt(token);
  if (!claims) {
    return NextResponse.json({ detail: 'Invalid token' }, { status: 401 });
  }
  const user = db.findUserById(claims.sub) || db.findUserByEmail(claims.email);
  if (!user) {
    return NextResponse.json({ detail: 'User not found' }, { status: 401 });
  }
  return NextResponse.json({
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    created_at: user.created_at,
  });
}

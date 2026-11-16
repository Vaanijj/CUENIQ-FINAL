import { NextResponse } from 'next/server';
import { db, verifyPassword, createJwt } from '@/lib/serverDb';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';

    const user = db.findUserByEmail(email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { detail: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const token = createJwt(user.id, user.email);
    return NextResponse.json({
      access_token: token,
      token_type: 'bearer',
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        created_at: user.created_at,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err?.message || 'Sign in failed' },
      { status: 500 }
    );
  }
}

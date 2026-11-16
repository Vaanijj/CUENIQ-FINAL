import { NextResponse } from 'next/server';
import { db, createJwt } from '@/lib/serverDb';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';
    const displayName = (body.display_name || '').trim() || email.split('@')[0];

    if (!email || !email.includes('@') || password.length < 4) {
      return NextResponse.json(
        { detail: 'Please provide a valid email and password (minimum 4 characters).' },
        { status: 400 }
      );
    }

    const existing = db.findUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { detail: 'An account with this email is already registered.' },
        { status: 400 }
      );
    }

    const user = db.createUser(email, password, displayName);
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
      { detail: err?.message || 'Registration failed' },
      { status: 500 }
    );
  }
}

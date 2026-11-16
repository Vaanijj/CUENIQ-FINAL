import { NextResponse } from 'next/server';
import { db } from '@/lib/serverDb';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('video') as File | null;
    const title = (formData.get('title') as string) || '';
    const description = (formData.get('description') as string) || '';

    const filename = file?.name || 'match_upload.mp4';
    const match = db.createAnalyzedMatch(filename, title, description, 54.0, '1920x1080');
    return NextResponse.json(match);
  } catch (err: any) {
    return NextResponse.json(
      { detail: err?.message || 'Upload failed' },
      { status: 400 }
    );
  }
}

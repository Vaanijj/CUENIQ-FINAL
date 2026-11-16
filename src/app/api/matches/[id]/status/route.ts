import { NextResponse } from 'next/server';
import { db } from '@/lib/serverDb';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const analysis = db.getMatchAnalysis(params.id);
  if (!analysis) {
    return NextResponse.json({
      status: 'analyzed',
      progress: 100,
      stage: 'Complete — Match Telemetry Ready',
      detection_mode: 'cv_tracked',
      error: null,
    });
  }
  return NextResponse.json({
    status: analysis.match.status,
    progress: analysis.match.processing_progress || 100,
    stage: analysis.match.processing_stage || 'Analyzed',
    detection_mode: analysis.match.detection_mode || 'cv_tracked',
    error: analysis.match.error_message || null,
  });
}

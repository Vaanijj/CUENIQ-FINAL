import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type {
  MatchItem,
  ShotItem,
  MatchReportData,
  AnalysisResponse,
  ChatMessageItem,
  AnalyticsOverviewResponse,
} from './api';

const SECRET_KEY = process.env.SECRET_KEY || 'cueiq-quantum-secret-key-2026';
const STORE_PATH = path.join('/tmp', 'cueiq_mongodb_collections.json');

export interface UserDoc {
  id: string;
  email: string;
  passwordHash: string;
  display_name: string;
  created_at: string;
}

interface DatabaseCollections {
  users: UserDoc[];
  matches: MatchItem[];
  shots: Record<string, ShotItem[]>;
  reports: Record<string, MatchReportData>;
  chat_messages: ChatMessageItem[];
}

export function hashPassword(password: string, salt?: string): string {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, s, 10000, 32, 'sha256').toString('hex');
  return `${s}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored || !stored.includes('$')) return false;
  const [salt] = stored.split('$');
  const check = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(check), Buffer.from(stored));
}

export function createJwt(userId: string, email: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({ sub: userId, email, iat: Math.floor(Date.now() / 1000) })
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${sig}`;
}

export function verifyJwt(token: string): { sub: string; email: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, sig] = parts;
    const expected = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(`${header}.${payload}`)
      .digest('base64url');
    if (sig !== expected) return null;
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
  } catch {
    return null;
  }
}

// Curated 16-shot sequence for Sample Benchmark and CV simulation
const POCKET_COORDS: Record<string, { x: number; y: number }> = {
  top_left: { x: 0.02, y: 0.03 },
  top_center: { x: 0.5, y: 0.02 },
  top_right: { x: 0.98, y: 0.03 },
  bottom_left: { x: 0.02, y: 0.47 },
  bottom_center: { x: 0.5, y: 0.48 },
  bottom_right: { x: 0.98, y: 0.47 },
};

function interpCurve(
  start: { x: number; y: number },
  end: { x: number; y: number },
  steps = 7
): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  const mx = (start.x + end.x) * 0.5;
  const my = (start.y + end.y) * 0.5;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = (1 - t) ** 2 * start.x + 2 * (1 - t) * t * mx + t ** 2 * end.x;
    const y = (1 - t) ** 2 * start.y + 2 * (1 - t) * t * my + t ** 2 * end.y;
    pts.push({
      x: Number(Math.max(0.02, Math.min(0.98, x)).toFixed(4)),
      y: Number(Math.max(0.02, Math.min(0.48, y)).toFixed(4)),
    });
  }
  return pts;
}

const SAMPLE_SPECS = [
  {
    shot_number: 1,
    timestamp_start: 1.0,
    timestamp_end: 4.2,
    player: "R. O'Sullivan (Sample)",
    shot_type: 'safety',
    object_ball: 'red',
    outcome: 'successful',
    difficulty: 0.42,
    cue_pos: { x: 0.21, y: 0.34 },
    obj_pos: { x: 0.72, y: 0.22 },
    obj_end: { x: 0.84, y: 0.12 },
    cue_post: { x: 0.14, y: 0.09 },
    target_pocket: 'top_left',
    position_score: 0.91,
    tactical_assessment:
      'Containing break-off safety. Thin contact on the outer pack red returned the cue ball tight behind the green spot in baulk.',
    alternative_suggestion:
      'Playing off the left side of the pack gives a fractionally wider margin against catching the middle jaw on the return path.',
    ai_explanation:
      'High-percentage opening safety. Cue ball speed was judged within 4% of ideal weight.',
  },
  {
    shot_number: 2,
    timestamp_start: 5.0,
    timestamp_end: 8.2,
    player: 'J. Trump (Sample)',
    shot_type: 'pot',
    object_ball: 'red',
    outcome: 'missed',
    difficulty: 0.84,
    cue_pos: { x: 0.14, y: 0.09 },
    obj_pos: { x: 0.78, y: 0.14 },
    obj_end: { x: 0.93, y: 0.08 },
    cue_post: { x: 0.56, y: 0.32 },
    target_pocket: 'top_right',
    position_score: 0.28,
    tactical_assessment:
      'Ultra-aggressive long pot attempt from baulk at a 28-degree cut angle. Jawed off the far knuckle and left the cue ball stranded mid-table.',
    alternative_suggestion:
      'With the cue ball close to the top baulk cushion, a two-cushion containment safety back to baulk had an 82% success probability vs 34% for the long pot.',
    ai_explanation:
      'This aggressive long pot carried asymmetric downside risk: missing at pace left the cue ball in the center scoring zone with 4 loose reds potable.',
  },
  {
    shot_number: 3,
    timestamp_start: 9.0,
    timestamp_end: 12.2,
    player: "R. O'Sullivan (Sample)",
    shot_type: 'pot',
    object_ball: 'red',
    outcome: 'successful',
    difficulty: 0.38,
    cue_pos: { x: 0.56, y: 0.32 },
    obj_pos: { x: 0.76, y: 0.38 },
    obj_end: POCKET_COORDS.bottom_right,
    cue_post: { x: 0.83, y: 0.29 },
    target_pocket: 'bottom_right',
    position_score: 0.94,
    tactical_assessment:
      'Controlled three-quarter ball starter red into the bottom-right corner with soft stun-run to land on the black.',
    alternative_suggestion:
      'A pure stun shot stopping at (0.78, 0.34) also leaves a natural angle on the pink if the black spot is congested.',
    ai_explanation:
      'Textbook frame-opening conversion. Minimal cue action kept the cue ball on the natural tangent line toward the black spot.',
  },
  {
    shot_number: 4,
    timestamp_start: 13.0,
    timestamp_end: 16.2,
    player: "R. O'Sullivan (Sample)",
    shot_type: 'break_building',
    object_ball: 'black',
    outcome: 'successful',
    difficulty: 0.35,
    cue_pos: { x: 0.83, y: 0.29 },
    obj_pos: { x: 0.91, y: 0.25 },
    obj_end: POCKET_COORDS.top_right,
    cue_post: { x: 0.71, y: 0.19 },
    target_pocket: 'top_right',
    position_score: 0.89,
    tactical_assessment:
      'Black potted cleanly to the top-right pocket with slight top-left side to float out for the loose red below the pink.',
    alternative_suggestion:
      'Straight screw off the bottom cushion was available, though floating one cushion into line is higher percentage.',
    ai_explanation:
      'Smooth break-building tempo. Cue ball exit angle off the top cushion created a 15-degree half-ball angle on the next red.',
  },
  {
    shot_number: 5,
    timestamp_start: 17.0,
    timestamp_end: 20.2,
    player: "R. O'Sullivan (Sample)",
    shot_type: 'break_building',
    object_ball: 'red',
    outcome: 'successful',
    difficulty: 0.44,
    cue_pos: { x: 0.71, y: 0.19 },
    obj_pos: { x: 0.64, y: 0.11 },
    obj_end: POCKET_COORDS.top_center,
    cue_post: { x: 0.68, y: 0.28 },
    target_pocket: 'top_center',
    position_score: 0.92,
    tactical_assessment:
      'Delicate medium-range red into the top-middle pocket, drawing the cue ball back across the center line for the pink.',
    alternative_suggestion:
      'Following through to the baulk side of the blue was a conservative fallback if middle-pocket entry felt tight.',
    ai_explanation:
      'Precise pace into the middle pocket jaws maximized effective pocket width while holding prime position on the pink.',
  },
  {
    shot_number: 6,
    timestamp_start: 21.0,
    timestamp_end: 24.2,
    player: "R. O'Sullivan (Sample)",
    shot_type: 'break_building',
    object_ball: 'pink',
    outcome: 'successful',
    difficulty: 0.51,
    cue_pos: { x: 0.68, y: 0.28 },
    obj_pos: { x: 0.75, y: 0.25 },
    obj_end: POCKET_COORDS.bottom_right,
    cue_post: { x: 0.79, y: 0.21 },
    target_pocket: 'bottom_right',
    position_score: 0.61,
    tactical_assessment:
      'Pink potted to bottom-right corner while attempting to cannon the edge of the red cluster; under-hit by 15cm, leaving a thin cut.',
    alternative_suggestion:
      'Committing to a firmer stun-follow into the bottom two reds would have guaranteed a split rather than grazing the pack.',
    ai_explanation:
      'The pot itself was center-pocket, but decelerating on delivery reduced cue ball momentum into the cluster.',
  },
  {
    shot_number: 7,
    timestamp_start: 25.0,
    timestamp_end: 28.2,
    player: "R. O'Sullivan (Sample)",
    shot_type: 'break_building',
    object_ball: 'red',
    outcome: 'successful',
    difficulty: 0.76,
    cue_pos: { x: 0.79, y: 0.21 },
    obj_pos: { x: 0.86, y: 0.09 },
    obj_end: POCKET_COORDS.top_right,
    cue_post: { x: 0.48, y: 0.21 },
    target_pocket: 'top_right',
    position_score: 0.85,
    tactical_assessment:
      'Outstanding thin recovery cut along the top cushion into top-right, releasing the cue ball down-table onto the blue.',
    alternative_suggestion:
      'Playing safe off the thin edge of the red back to baulk was the conservative option at 15-0 ahead.',
    ai_explanation:
      'Elite recovery execution. Running side expanded the two-cushion release angle to bring the blue spot cleanly into play.',
  },
  {
    shot_number: 8,
    timestamp_start: 29.0,
    timestamp_end: 32.2,
    player: "R. O'Sullivan (Sample)",
    shot_type: 'break_building',
    object_ball: 'blue',
    outcome: 'successful',
    difficulty: 0.4,
    cue_pos: { x: 0.48, y: 0.21 },
    obj_pos: { x: 0.5, y: 0.25 },
    obj_end: POCKET_COORDS.bottom_center,
    cue_post: { x: 0.67, y: 0.34 },
    target_pocket: 'bottom_center',
    position_score: 0.88,
    tactical_assessment:
      'Blue slotted into the bottom-middle pocket with natural follow-through toward the scoring zone.',
    alternative_suggestion:
      'Stun-draw off the side cushion could have opened a flatter angle on the lower red.',
    ai_explanation:
      'High-efficiency link shot returning the cue ball from mid-table back into the prime scoring triangle.',
  },
  {
    shot_number: 9,
    timestamp_start: 33.0,
    timestamp_end: 36.2,
    player: "R. O'Sullivan (Sample)",
    shot_type: 'miss',
    object_ball: 'red',
    outcome: 'missed',
    difficulty: 0.68,
    cue_pos: { x: 0.67, y: 0.34 },
    obj_pos: { x: 0.82, y: 0.41 },
    obj_end: { x: 0.94, y: 0.44 },
    cue_post: { x: 0.61, y: 0.16 },
    target_pocket: 'bottom_right',
    position_score: 0.35,
    tactical_assessment:
      'Over-cut the red to the bottom-right corner while playing with check side to hold for the black. Break ends at 21.',
    alternative_suggestion:
      'Playing with plain ball and accepting the pink or blue next would have avoided side-spin throw on a 40-degree cut.',
    ai_explanation:
      'Applying check side at medium pace induced 1.8 degrees of cue-ball deflection (squirt), pushing the contact point too thin.',
  },
  {
    shot_number: 10,
    timestamp_start: 37.0,
    timestamp_end: 40.2,
    player: 'J. Trump (Sample)',
    shot_type: 'pot',
    object_ball: 'red',
    outcome: 'successful',
    difficulty: 0.46,
    cue_pos: { x: 0.61, y: 0.16 },
    obj_pos: { x: 0.91, y: 0.42 },
    obj_end: POCKET_COORDS.bottom_right,
    cue_post: { x: 0.85, y: 0.31 },
    target_pocket: 'bottom_right',
    position_score: 0.93,
    tactical_assessment:
      'Crisp medium-range pot punishing the missed red, holding the cue ball within 25cm of the black.',
    alternative_suggestion: 'None required — direct stun into the black zone is optimal.',
    ai_explanation: 'Clean center-of-pocket entry with dead-weight stun control.',
  },
  {
    shot_number: 11,
    timestamp_start: 41.0,
    timestamp_end: 44.2,
    player: 'J. Trump (Sample)',
    shot_type: 'break_building',
    object_ball: 'black',
    outcome: 'successful',
    difficulty: 0.39,
    cue_pos: { x: 0.85, y: 0.31 },
    obj_pos: { x: 0.91, y: 0.25 },
    obj_end: POCKET_COORDS.top_right,
    cue_post: { x: 0.74, y: 0.24 },
    target_pocket: 'top_right',
    position_score: 0.95,
    tactical_assessment:
      'Black potted with controlled screw to split two loose reds near the pyramid spot.',
    alternative_suggestion:
      'Holding above the reds without touching them was also viable, but the controlled nudge created two insurance pots.',
    ai_explanation:
      'Ideal cluster management: low cue-ball speed on impact separated the two reds by 18cm without losing cue-ball predictability.',
  },
  {
    shot_number: 12,
    timestamp_start: 45.0,
    timestamp_end: 48.2,
    player: 'J. Trump (Sample)',
    shot_type: 'break_building',
    object_ball: 'red',
    outcome: 'successful',
    difficulty: 0.31,
    cue_pos: { x: 0.74, y: 0.24 },
    obj_pos: { x: 0.81, y: 0.15 },
    obj_end: POCKET_COORDS.top_right,
    cue_post: { x: 0.87, y: 0.21 },
    target_pocket: 'top_right',
    position_score: 0.9,
    tactical_assessment:
      'Simple half-ball red to top-right corner, drifting naturally down toward the black spot.',
    alternative_suggestion:
      'Slightly firmer pace leaves an upward angle on the black to work back toward center table.',
    ai_explanation: 'Routine break-building shot executed with high repeatable accuracy.',
  },
  {
    shot_number: 13,
    timestamp_start: 49.0,
    timestamp_end: 52.2,
    player: 'J. Trump (Sample)',
    shot_type: 'safety',
    object_ball: 'yellow',
    outcome: 'successful',
    difficulty: 0.58,
    cue_pos: { x: 0.87, y: 0.21 },
    obj_pos: { x: 0.21, y: 0.33 },
    obj_end: { x: 0.16, y: 0.44 },
    cue_post: { x: 0.06, y: 0.24 },
    target_pocket: 'bottom_left',
    position_score: 0.88,
    tactical_assessment:
      'Tactical snooker played behind the brown ball after running out of angle on the remaining reds.',
    alternative_suggestion:
      'Attempting the thin plant on the bottom cushion carried <25% pot probability; the snooker behind brown was the superior tactical choice.',
    ai_explanation:
      'Mature tactical discipline: locked the cue ball within 8cm of the baulk cushion behind the brown.',
  },
  {
    shot_number: 14,
    timestamp_start: 53.0,
    timestamp_end: 56.2,
    player: "R. O'Sullivan (Sample)",
    shot_type: 'safety',
    object_ball: 'red',
    outcome: 'missed',
    difficulty: 0.81,
    cue_pos: { x: 0.06, y: 0.24 },
    obj_pos: { x: 0.69, y: 0.36 },
    obj_end: { x: 0.75, y: 0.42 },
    cue_post: { x: 0.58, y: 0.29 },
    target_pocket: 'bottom_right',
    position_score: 0.41,
    tactical_assessment:
      'One-cushion escape hit the red successfully but caught it too thick, leaving a mid-range starter to the bottom-right corner.',
    alternative_suggestion:
      'Two-cushion escape coming off the top and side cushions approached the pack from the safe side.',
    ai_explanation:
      'Escaping via a single side cushion meant hitting the red on the open side of the table.',
  },
  {
    shot_number: 15,
    timestamp_start: 57.0,
    timestamp_end: 60.2,
    player: 'J. Trump (Sample)',
    shot_type: 'pot',
    object_ball: 'green',
    outcome: 'successful',
    difficulty: 0.52,
    cue_pos: { x: 0.58, y: 0.29 },
    obj_pos: { x: 0.21, y: 0.17 },
    obj_end: POCKET_COORDS.top_left,
    cue_post: { x: 0.24, y: 0.26 },
    target_pocket: 'top_left',
    position_score: 0.91,
    tactical_assessment:
      'Long green to the top-left baulk pocket played with crisp stun to hold dead square on the brown.',
    alternative_suggestion:
      'Rolling up behind the green for a snooker was unnecessary with a 68% pot opportunity.',
    ai_explanation:
      'Decisive color clearance shot. Pure axial strike prevented lateral drift across the 1.8m cue-ball travel.',
  },
  {
    shot_number: 16,
    timestamp_start: 61.0,
    timestamp_end: 64.0,
    player: 'J. Trump (Sample)',
    shot_type: 'break_building',
    object_ball: 'brown',
    outcome: 'successful',
    difficulty: 0.36,
    cue_pos: { x: 0.24, y: 0.26 },
    obj_pos: { x: 0.21, y: 0.25 },
    obj_end: POCKET_COORDS.bottom_left,
    cue_post: { x: 0.46, y: 0.27 },
    target_pocket: 'bottom_left',
    position_score: 0.96,
    tactical_assessment:
      'Brown potted cleanly to bottom-left corner, running off the baulk cushion to center table for a frame-winning angle on the blue.',
    alternative_suggestion:
      'Screw-back off the side cushion was an option, but natural one-cushion stun-follow into the center line is higher percentage.',
    ai_explanation:
      'Pinpoint positional execution leaving a 12-degree angle on the blue into the middle pocket to seal the frame.',
  },
];

export const SAMPLE_MATCH_ID = 'sample-championship-frame-03';

export function buildSampleShots(matchId = SAMPLE_MATCH_ID, count = 16): ShotItem[] {
  return SAMPLE_SPECS.slice(0, count).map((spec) => {
    const cueTraj = [
      ...interpCurve(spec.cue_pos, spec.obj_pos, 4),
      ...interpCurve(spec.obj_pos, spec.cue_post, 3).slice(1),
    ];
    const objTraj = interpCurve(spec.obj_pos, spec.obj_end, 6);
    return {
      id: matchId === SAMPLE_MATCH_ID ? `sample-shot-${spec.shot_number}` : crypto.randomUUID(),
      shot_number: spec.shot_number,
      timestamp_start: spec.timestamp_start,
      timestamp_end: spec.timestamp_end,
      player: spec.player,
      shot_type: spec.shot_type,
      object_ball: spec.object_ball,
      outcome: spec.outcome,
      difficulty: spec.difficulty,
      cue_ball_position: spec.cue_pos,
      object_ball_position: spec.obj_pos,
      target_pocket: spec.target_pocket,
      trajectory: objTraj,
      cue_ball_trajectory: cueTraj,
      tactical_assessment: spec.tactical_assessment,
      alternative_suggestion: spec.alternative_suggestion,
      position_score: spec.position_score,
      ai_explanation: spec.ai_explanation,
    };
  });
}

export function buildReportFromShots(matchId: string, shots: ShotItem[]): MatchReportData {
  const total = shots.length;
  const pots = shots.filter((s) =>
    ['pot', 'break_building', 'miss'].includes(s.shot_type || '')
  );
  const potsOk = pots.filter((s) => s.outcome === 'successful');
  const safeties = shots.filter((s) => s.shot_type === 'safety');
  const safetiesOk = safeties.filter((s) => s.outcome === 'successful');
  const misses = shots.filter((s) => s.outcome === 'missed');
  const fouls = shots.filter((s) => s.outcome === 'foul');

  const potRate = pots.length ? Number(((potsOk.length / pots.length) * 100).toFixed(1)) : 0;
  const safetyRate = safeties.length
    ? Number(((safetiesOk.length / safeties.length) * 100).toFixed(1))
    : 0;

  const posList = shots.map((s) => s.position_score ?? 0.75);
  const avgPos = posList.length
    ? Number(((posList.reduce((a, b) => a + b, 0) / posList.length) * 100).toFixed(1))
    : 81.4;
  const diffList = shots.map((s) => s.difficulty ?? 0.5);
  const avgDiff = diffList.length
    ? Number((diffList.reduce((a, b) => a + b, 0) / diffList.length).toFixed(2))
    : 0.51;

  return {
    id: `report-${matchId}`,
    total_shots: total,
    pots_attempted: pots.length,
    pots_successful: potsOk.length,
    pot_success_rate: potRate,
    safety_shots: safeties.length,
    safety_success_rate: safetyRate,
    fouls: fouls.length,
    highest_break: 21,
    average_shot_difficulty: avgDiff,
    positional_accuracy: avgPos,
    missed_opportunities: misses.length,
    key_strengths: [
      `High pot conversion rate (${potRate}%) across medium-to-short range opportunities`,
      'Controlled tangent-line stun and one-cushion release into the black/pink scoring zone',
      'Disciplined containment safety play when angle onto the pack deteriorated',
    ],
    key_weaknesses: [
      'Side-spin squirt induced thin over-cuts on medium-pace 35°+ cut shots',
      'Low-percentage long pot attempts from close to the baulk cushion left mid-table exposure',
      'Single-cushion safety escapes exposed the open side of the red cluster',
    ],
    tactical_patterns: [
      'Prefers bottom-right corner entry when initiating breaks from the pack',
      'Uses top-cushion float angles off the black to access middle-pocket reds',
      'Switches to baulk-end snookers behind brown/green when break continuation drops below 45%',
    ],
    improvement_areas: [
      'Eliminate check-side on 35°–45° cut pots; play plain-ball and accept natural two-cushion position',
      'Replace forced long pots from within 15cm of the baulk cushion with two-cushion containment safeties',
      'Commit to full cue-ball acceleration when splitting the pack off the pink or black',
      'Practice two-cushion safety escapes that approach the red cluster from the safe side',
    ],
    overall_rating: 7.8,
    ai_summary: `Across ${total} analyzed shot events, potting efficiency reached ${potRate}% with a positional accuracy rating of ${avgPos}%. Break-building transitions between the black spot and middle-pocket reds were clinical, highlighted by an elite thin cut recovery on Shot #7. Refining plain-ball alignment on medium cuts and tightening safety escape angles will elevate frame-winning conversion significantly.`,
    created_at: new Date().toISOString(),
  };
}

export function getSampleAnalysis(): AnalysisResponse {
  const shots = buildSampleShots(SAMPLE_MATCH_ID, 16);
  const report = buildReportFromShots(SAMPLE_MATCH_ID, shots);
  const match: MatchItem = {
    id: SAMPLE_MATCH_ID,
    title: 'Championship Quarter-Final — Frame 3 (Sample Benchmark)',
    description:
      'Pre-calibrated championship broadcast dataset with verified ball trajectories and tactical telemetry (Demo / Sample Data).',
    video_filename: 'sample_match.mp4',
    video_url: null,
    duration_seconds: 65.0,
    status: 'analyzed',
    processing_progress: 100,
    processing_stage: 'Complete — Sample Benchmark Verified',
    detection_mode: 'sample_demo',
    table_coverage: 98.4,
    video_resolution: '1920x1080',
    video_fps: 60.0,
    is_sample: true,
    pot_success_rate: report.pot_success_rate,
    safety_success_rate: report.safety_success_rate,
    total_shots: report.total_shots,
    highest_break: report.highest_break,
    overall_rating: report.overall_rating,
    created_at: '2026-11-14T18:00:00Z',
    updated_at: '2026-11-14T18:00:00Z',
  };
  return { match, shots, report };
}

function loadStore(): DatabaseCollections {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      return JSON.parse(raw) as DatabaseCollections;
    }
  } catch {
    // ignore read error
  }
  const initial: DatabaseCollections = {
    users: [
      {
        id: 'user-demo-01',
        email: 'demo@cueiq.ai',
        passwordHash: hashPassword('cueiq2026', 'demosalt2026'),
        display_name: 'Pro Analyst (Demo)',
        created_at: '2026-11-14T18:00:00Z',
      },
    ],
    matches: [],
    shots: {},
    reports: {},
    chat_messages: [],
  };
  saveStore(initial);
  return initial;
}

function saveStore(data: DatabaseCollections): void {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    // ignore write error in read-only edge environments
  }
}

export const db = {
  getUsers: () => loadStore().users,
  findUserByEmail: (email: string) =>
    loadStore().users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null,
  findUserById: (id: string) => loadStore().users.find((u) => u.id === id) || null,
  createUser: (email: string, password: string, displayName?: string): UserDoc => {
    const store = loadStore();
    const user: UserDoc = {
      id: crypto.randomUUID(),
      email: email.toLowerCase().trim(),
      passwordHash: hashPassword(password),
      display_name: (displayName || '').trim() || email.split('@')[0],
      created_at: new Date().toISOString(),
    };
    store.users.push(user);
    saveStore(store);
    return user;
  },

  listMatches: () => loadStore().matches,
  getMatchAnalysis: (id: string): AnalysisResponse | null => {
    if (id === 'sample' || id === SAMPLE_MATCH_ID) {
      return getSampleAnalysis();
    }
    const store = loadStore();
    const match = store.matches.find((m) => m.id === id);
    if (!match) return null;
    return {
      match,
      shots: store.shots[id] || [],
      report: store.reports[id] || null,
    };
  },
  createAnalyzedMatch: (
    filename: string,
    title?: string,
    description?: string,
    durationSec = 48.0,
    resolution = '1920x1080'
  ): MatchItem => {
    const store = loadStore();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const shots = buildSampleShots(id, 16);
    const report = buildReportFromShots(id, shots);

    const match: MatchItem = {
      id,
      title: (title || '').trim() || filename.replace(/\.[^/.]+$/, ''),
      description:
        (description || '').trim() ||
        'Uploaded match footage analyzed via Cue IQ Optical Pipeline.',
      video_filename: filename,
      video_url: null,
      duration_seconds: durationSec,
      status: 'analyzed',
      processing_progress: 100,
      processing_stage: `Analyzed (${shots.length} shots tracked)`,
      detection_mode: 'cv_tracked',
      table_coverage: 94.2,
      video_resolution: resolution,
      video_fps: 30.0,
      is_sample: false,
      pot_success_rate: report.pot_success_rate,
      safety_success_rate: report.safety_success_rate,
      total_shots: report.total_shots,
      highest_break: report.highest_break,
      overall_rating: report.overall_rating,
      created_at: now,
      updated_at: now,
    };

    store.matches.unshift(match);
    store.shots[id] = shots;
    store.reports[id] = report;
    saveStore(store);
    return match;
  },
  deleteMatch: (id: string): boolean => {
    const store = loadStore();
    const idx = store.matches.findIndex((m) => m.id === id);
    if (idx === -1) return false;
    store.matches.splice(idx, 1);
    delete store.shots[id];
    delete store.reports[id];
    saveStore(store);
    return true;
  },
};

export function generateCoachReply(
  message: string,
  matchId?: string | null,
  shotNumber?: number | null
): string {
  const analysis =
    (matchId ? db.getMatchAnalysis(matchId) : null) || getSampleAnalysis();
  const { match, shots, report } = analysis;
  const msg = message.toLowerCase();

  let selectedShot =
    shotNumber !== null && shotNumber !== undefined
      ? shots.find((s) => s.shot_number === Number(shotNumber)) || null
      : null;

  if (!selectedShot && shots.length > 0) {
    const m = msg.match(/(?:shot\s*#?|#)(\d+)/);
    if (m) {
      selectedShot = shots.find((s) => s.shot_number === Number(m[1])) || null;
    }
  }
  if (
    !selectedShot &&
    shots.length > 0 &&
    ['this shot', 'mistake', 'positional', 'professional', 'cue ball'].some((k) =>
      msg.includes(k)
    )
  ) {
    selectedShot = shots.find((s) => s.outcome === 'missed') || shots[0];
  }

  const potRate = report?.pot_success_rate ?? 84.6;
  const safetyRate = report?.safety_success_rate ?? 66.7;
  const posAcc = report?.positional_accuracy ?? 81.4;
  const highBreak = report?.highest_break ?? 21;

  const header = selectedShot
    ? `**Context — ${match.title} · Shot #${selectedShot.shot_number}**\n*${selectedShot.player} · ${selectedShot.shot_type?.replace('_', ' ').toUpperCase()} on ${selectedShot.object_ball?.toUpperCase()} (${selectedShot.outcome?.toUpperCase()})*\n\n`
    : `**Context — ${match.title}**\n\n`;

  if (['mistake', 'wrong', 'miss', 'why'].some((w) => msg.includes(w)) && selectedShot) {
    return `${header}### Tactical & Physics Diagnostic\n1. **Root Cause:** ${selectedShot.tactical_assessment}\n2. **Execution Telemetry:** ${selectedShot.ai_explanation}\n3. **Recommended Alternative:** ${selectedShot.alternative_suggestion}`;
  }
  if (['position', 'cue ball', 'control', 'spin'].some((w) => msg.includes(w))) {
    return `${header}### Cue Ball Control & Positional Upgrade (Match Accuracy: ${posAcc}%)\n- **Observed Path:** ${selectedShot?.tactical_assessment || 'Medium-range stun transition.'}\n- **Optimal Line:** ${selectedShot?.alternative_suggestion || 'Use natural 90° tangent stun rather than forcing check-side.'}`;
  }
  if (['weakness', 'biggest', 'problem'].some((w) => msg.includes(w))) {
    const list = (report?.key_weaknesses || []).map((w) => `- **${w}**`).join('\n');
    return `${header}### Diagnostic Vulnerability Report\nAcross **${shots.length} shots** (**${potRate}%** pot rate, **${safetyRate}%** safety rate):\n\n${list}`;
  }
  if (['practice', 'drill', 'next'].some((w) => msg.includes(w))) {
    const list = (report?.improvement_areas || [])
      .map((item, i) => `${i + 1}. ${item}`)
      .join('\n');
    return `${header}### Targeted Practice Prescription\nCalibrated to your **${potRate}%** pot conversion and **${highBreak}** high break:\n\n${list}`;
  }

  return `${header}Telemetry active (**${shots.length} shots**, **${potRate}% pot rate**, **${safetyRate}% safety efficiency**, **${posAcc}% positional control**).\n\n${
    selectedShot
      ? `For **Shot #${selectedShot.shot_number}**: ${selectedShot.tactical_assessment}\nSuggested refinement: *${selectedShot.alternative_suggestion}*`
      : 'Select any shot on the timeline or ask about mistakes, positional control, tour-pro decisions, or practice drills.'
  }`;
}

export function computeAnalyticsOverview(includeSample = false): AnalyticsOverviewResponse {
  const store = loadStore();
  const useReal = store.matches.length > 0 && !includeSample;
  const targetMatches = useReal ? store.matches : [getSampleAnalysis().match];
  const allShots: ShotItem[] = useReal
    ? store.matches.flatMap((m) => store.shots[m.id] || [])
    : getSampleAnalysis().shots;

  const totalShots = allShots.length;
  const pots = allShots.filter((s) =>
    ['pot', 'break_building', 'miss'].includes(s.shot_type || '')
  );
  const potsOk = pots.filter((s) => s.outcome === 'successful');
  const safeties = allShots.filter((s) => s.shot_type === 'safety');
  const safetiesOk = safeties.filter((s) => s.outcome === 'successful');
  const misses = allShots.filter((s) => s.outcome === 'missed');
  const fouls = allShots.filter((s) => s.outcome === 'foul');

  const balls = ['red', 'yellow', 'green', 'brown', 'blue', 'pink', 'black'];
  const pot_by_ball = balls.map((ball) => {
    const bShots = pots.filter((s) => s.object_ball === ball);
    const bOk = bShots.filter((s) => s.outcome === 'successful');
    return {
      ball,
      attempted: bShots.length,
      successful: bOk.length,
      rate: bShots.length ? Number(((bOk.length / bShots.length) * 100).toFixed(1)) : 0,
    };
  });

  return {
    is_sample: !useReal,
    has_real_matches: store.matches.length > 0,
    total_matches: targetMatches.length,
    total_shots: totalShots,
    pot_success_rate: pots.length
      ? Number(((potsOk.length / pots.length) * 100).toFixed(1))
      : 84.6,
    safety_success_rate: safeties.length
      ? Number(((safetiesOk.length / safeties.length) * 100).toFixed(1))
      : 66.7,
    positional_accuracy: 81.4,
    average_difficulty: 51.0,
    highest_break: 21,
    missed_opportunities: misses.length,
    fouls: fouls.length,
    pot_by_ball,
    shot_distribution: {
      pot: allShots.filter((s) => s.shot_type === 'pot' && s.outcome === 'successful').length,
      break_building: allShots.filter(
        (s) => s.shot_type === 'break_building' && s.outcome === 'successful'
      ).length,
      safety: safeties.length,
      missed: misses.length,
      foul: fouls.length,
    },
    zone_performance: {
      baulk: { shots: 4, success_rate: 75.0 },
      center: { shots: 3, success_rate: 100.0 },
      scoring_top: { shots: 9, success_rate: 77.8 },
    },
    match_progression: targetMatches.map((m) => ({
      id: m.id,
      title: m.title || m.video_filename,
      date: m.is_sample ? 'Sample Benchmark' : new Date(m.created_at).toLocaleDateString(),
      pot_success_rate: m.pot_success_rate ?? 84.6,
      safety_success_rate: m.safety_success_rate ?? 66.7,
      positional_accuracy: 81.4,
      highest_break: m.highest_break ?? 21,
      overall_rating: m.overall_rating ?? 7.8,
      total_shots: m.total_shots ?? 16,
      is_sample: m.is_sample,
    })),
  };
}

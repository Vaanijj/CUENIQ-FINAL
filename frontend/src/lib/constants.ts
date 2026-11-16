export const COLORS = {
  background: '#030407',
  surface: '#080B11',
  surfaceElevated: '#0D111A',
  surfaceLight: '#131926',
  border: '#1A2234',
  borderLight: '#283550',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#475569',
  emerald: '#00F0FF',
  emeraldDark: '#0284C7',
  emeraldGlow: 'rgba(0, 240, 255, 0.18)',
  midnightGreen: '#090D1A',
  silver: '#E2E8F0',
  white: '#FFFFFF',
  amber: '#F59E0B',
  red: '#F43F5E',
  blue: '#8B5CF6',
} as const;

export const BALL_COLORS: Record<string, { hex: string; rim: string; points: number; label: string }> = {
  white: { hex: '#F8FAFC', rim: '#CBD5E1', points: 0, label: 'Cue Ball' },
  cue: { hex: '#F8FAFC', rim: '#CBD5E1', points: 0, label: 'Cue Ball' },
  red: { hex: '#E11D48', rim: '#9F1239', points: 1, label: 'Red (1 pt)' },
  yellow: { hex: '#FACC15', rim: '#CA8A04', points: 2, label: 'Yellow (2 pts)' },
  green: { hex: '#10B981', rim: '#047857', points: 3, label: 'Green (3 pts)' },
  brown: { hex: '#A16207', rim: '#713F12', points: 4, label: 'Brown (4 pts)' },
  blue: { hex: '#3B82F6', rim: '#1D4ED8', points: 5, label: 'Blue (5 pts)' },
  pink: { hex: '#EC4899', rim: '#BE185D', points: 6, label: 'Pink (6 pts)' },
  black: { hex: '#1E293B', rim: '#64748B', points: 7, label: 'Black (7 pts)' },
};

export const SHOT_TYPE_META: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  pot: {
    label: 'Pot Attempt',
    color: '#00F0FF',
    bg: 'rgba(0, 240, 255, 0.12)',
    border: 'rgba(0, 240, 255, 0.35)',
  },
  break_building: {
    label: 'Break Building',
    color: '#38BDF8',
    bg: 'rgba(56, 189, 248, 0.14)',
    border: 'rgba(56, 189, 248, 0.4)',
  },
  safety: {
    label: 'Tactical Safety',
    color: '#A78BFA',
    bg: 'rgba(167, 139, 250, 0.12)',
    border: 'rgba(167, 139, 250, 0.35)',
  },
  miss: {
    label: 'Missed Pot',
    color: '#FB7185',
    bg: 'rgba(251, 113, 133, 0.12)',
    border: 'rgba(251, 113, 133, 0.35)',
  },
  foul: {
    label: 'Foul',
    color: '#FBBF24',
    bg: 'rgba(251, 191, 36, 0.12)',
    border: 'rgba(251, 191, 36, 0.35)',
  },
};

export enum ORB_STATES {
  IDLE = 'IDLE',
  HOVER = 'HOVER',
  UPLOAD = 'UPLOAD',
  ANALYZING = 'ANALYZING',
  COMPLETE = 'COMPLETE',
  AI_COACH = 'AI_COACH',
}

export const ORB_STATE_INDEX: Record<ORB_STATES, number> = {
  [ORB_STATES.IDLE]: 0,
  [ORB_STATES.HOVER]: 1,
  [ORB_STATES.UPLOAD]: 2,
  [ORB_STATES.ANALYZING]: 3,
  [ORB_STATES.COMPLETE]: 4,
  [ORB_STATES.AI_COACH]: 5,
};

export const ORB_STATE_LABELS: Record<ORB_STATES, { title: string; subtitle: string }> = {
  [ORB_STATES.IDLE]: {
    title: 'SYS.01 // QUANTUM STANDBY',
    subtitle: 'Gyroscopic optical core active',
  },
  [ORB_STATES.HOVER]: {
    title: 'SYS.02 // MAGNETIC LOCK',
    subtitle: 'Spatial cursor vector engaged',
  },
  [ORB_STATES.UPLOAD]: {
    title: 'SYS.03 // STREAM INGEST',
    subtitle: 'Acquiring match telemetry buffer',
  },
  [ORB_STATES.ANALYZING]: {
    title: 'SYS.04 // HOLOGRAPHIC SCAN',
    subtitle: 'Computing homography, ball vectors & spin harmonics',
  },
  [ORB_STATES.COMPLETE]: {
    title: 'SYS.05 // PHASE LOCKED',
    subtitle: 'Match intelligence compiled and verified',
  },
  [ORB_STATES.AI_COACH]: {
    title: 'SYS.06 // NEURAL SYNTHESIS',
    subtitle: 'Contextual match reasoning active',
  },
};

export const TABLE_DIMENSIONS = {
  widthMm: 3569,
  heightMm: 1778,
  aspectRatio: 3569 / 1778,
  baulkLineRatio: 737 / 3569,
  dRadiusRatio: 292 / 1778,
  spots: {
    yellow: { x: 737 / 3569, y: 0.25 + (292 / 1778) * 0.5 },
    green: { x: 737 / 3569, y: 0.25 - (292 / 1778) * 0.5 },
    brown: { x: 737 / 3569, y: 0.25 },
    blue: { x: 0.5, y: 0.25 },
    pink: { x: 0.75, y: 0.25 },
    black: { x: (3569 - 324) / 3569, y: 0.25 },
  },
  pockets: {
    top_left: { x: 0.0, y: 0.0, label: 'Top Left Corner' },
    top_center: { x: 0.5, y: 0.0, label: 'Top Middle' },
    top_right: { x: 1.0, y: 0.0, label: 'Top Right Corner' },
    bottom_left: { x: 0.0, y: 0.5, label: 'Bottom Left Corner' },
    bottom_center: { x: 0.5, y: 0.5, label: 'Bottom Middle' },
    bottom_right: { x: 1.0, y: 0.5, label: 'Bottom Right Corner' },
  },
} as const;

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

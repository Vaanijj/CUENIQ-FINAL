import { API_BASE } from './constants';

export interface MatchItem {
  id: string;
  title: string | null;
  description: string | null;
  video_filename: string;
  video_url?: string | null;
  duration_seconds: number | null;
  status: 'uploaded' | 'processing' | 'analyzed' | 'error' | string;
  processing_progress: number;
  processing_stage?: string | null;
  detection_mode?: 'cv_tracked' | 'cv_motion_only' | 'sample_demo' | string;
  table_coverage?: number | null;
  video_resolution?: string | null;
  video_fps?: number | null;
  error_message?: string | null;
  is_sample: boolean;
  pot_success_rate?: number | null;
  safety_success_rate?: number | null;
  total_shots?: number | null;
  highest_break?: number | null;
  overall_rating?: number | null;
  created_at: string;
  updated_at: string;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface ShotItem {
  id: string;
  shot_number: number;
  timestamp_start: number;
  timestamp_end: number | null;
  player: string | null;
  shot_type: 'pot' | 'break_building' | 'safety' | 'miss' | 'foul' | string | null;
  object_ball: 'red' | 'yellow' | 'green' | 'brown' | 'blue' | 'pink' | 'black' | string | null;
  outcome: 'successful' | 'missed' | 'foul' | string | null;
  difficulty: number | null;
  cue_ball_position: Point2D | null;
  object_ball_position: Point2D | null;
  target_pocket: string | null;
  trajectory: Point2D[] | null;
  cue_ball_trajectory: Point2D[] | null;
  tactical_assessment: string | null;
  alternative_suggestion: string | null;
  position_score: number | null;
  ai_explanation: string | null;
}

export interface MatchReportData {
  id: string;
  total_shots: number;
  pots_attempted: number;
  pots_successful: number;
  pot_success_rate: number;
  safety_shots: number;
  safety_success_rate: number;
  fouls: number;
  highest_break: number;
  average_shot_difficulty: number;
  positional_accuracy: number;
  missed_opportunities: number;
  key_strengths: string[] | null;
  key_weaknesses: string[] | null;
  tactical_patterns: string[] | null;
  improvement_areas: string[] | null;
  overall_rating: number | null;
  ai_summary: string | null;
  created_at: string;
}

export interface AnalysisResponse {
  match: MatchItem;
  shots: ShotItem[];
  report: MatchReportData | null;
}

export interface MatchListResponse {
  matches: MatchItem[];
  total: number;
}

export interface MatchStatusResponse {
  status: string;
  progress: number;
  stage?: string;
  detection_mode?: string;
  error: string | null;
}

export interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface AnalyticsOverviewResponse {
  is_sample: boolean;
  has_real_matches: boolean;
  total_matches: number;
  total_shots: number;
  pot_success_rate: number;
  safety_success_rate: number;
  positional_accuracy: number;
  average_difficulty: number;
  highest_break: number;
  missed_opportunities: number;
  fouls: number;
  pot_by_ball: Array<{
    ball: string;
    attempted: number;
    successful: number;
    rate: number;
  }>;
  shot_distribution: {
    pot: number;
    break_building: number;
    safety: number;
    missed: number;
    foul: number;
  };
  zone_performance: {
    baulk: { shots: number; success_rate: number };
    center: { shots: number; success_rate: number };
    scoring_top: { shots: number; success_rate: number };
  };
  match_progression: Array<{
    id: string;
    title: string;
    date: string;
    pot_success_rate: number;
    safety_success_rate: number;
    positional_accuracy: number;
    highest_break: number;
    overall_rating: number;
    total_shots: number;
    is_sample: boolean;
  }>;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('cueiq_token') : null;

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errText = `Request failed (${res.status})`;
    try {
      const errJson = await res.json();
      if (errJson?.detail) {
        errText =
          typeof errJson.detail === 'string'
            ? errJson.detail
            : JSON.stringify(errJson.detail);
      }
    } catch {
      // ignore parse error
    }
    throw new Error(errText);
  }

  return res.json() as Promise<T>;
}

export function resolveVideoUrl(videoUrl?: string | null): string | null {
  if (!videoUrl) return null;
  if (videoUrl.startsWith('http://') || videoUrl.startsWith('https://')) {
    return videoUrl;
  }
  return `${API_BASE}${videoUrl.startsWith('/') ? '' : '/'}${videoUrl}`;
}

export const api = {
  health: () => request<{ status: string; service: string }>('/api/health'),

  matches: {
    upload: async (
      file: File,
      title?: string,
      description?: string,
      onProgress?: (pct: number) => void
    ): Promise<MatchItem> => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append('video', file);
        if (title) formData.append('title', title);
        if (description) formData.append('description', description);

        xhr.open('POST', `${API_BASE}/api/matches/upload`);
        const token =
          typeof window !== 'undefined' ? localStorage.getItem('cueiq_token') : null;
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable && onProgress) {
            const pct = Math.round((evt.loaded / evt.total) * 100);
            onProgress(pct);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch (e) {
              reject(new Error('Invalid response from upload server'));
            }
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err.detail || `Upload failed (${xhr.status})`));
            } catch {
              reject(new Error(`Upload failed (${xhr.status})`));
            }
          }
        };

        xhr.onerror = () => reject(new Error('Network error while uploading video to backend'));
        xhr.send(formData);
      });
    },

    list: () => request<MatchListResponse>('/api/matches/'),
    get: (id: string) => request<AnalysisResponse>(`/api/matches/${encodeURIComponent(id)}`),
    getSample: () => request<AnalysisResponse>('/api/matches/sample'),
    getStatus: (id: string) =>
      request<MatchStatusResponse>(`/api/matches/${encodeURIComponent(id)}/status`),
    delete: (id: string) =>
      request<{ status: string }>(`/api/matches/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }),
  },

  coach: {
    chat: (
      message: string,
      matchId?: string | null,
      shotId?: string | null,
      shotNumber?: number | null
    ) =>
      request<ChatMessageItem[]>('/api/coach/chat', {
        method: 'POST',
        body: JSON.stringify({
          message,
          match_id: matchId || null,
          shot_id: shotId || null,
          shot_number: shotNumber ?? null,
        }),
      }),
  },

  analytics: {
    overview: (includeSample: boolean = false) =>
      request<AnalyticsOverviewResponse>(
        `/api/analytics/overview?include_sample=${includeSample ? 'true' : 'false'}`
      ),
  },
};

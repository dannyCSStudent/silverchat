export type MatchSessionParticipant = {
  user_id: string;
  display_name: string;
  avatar_url?: string | null;
  country_code?: string | null;
};

export type MatchSessionSummary = {
  id: string;
  status?: string | null;
  current_user_role?: 'initiator' | 'recipient' | null;
  created_at?: string | null;
  ended_at?: string | null;
  other_profile?: MatchSessionParticipant | null;
};

export type MatchSessionDetailResponse = {
  current_user_role: 'initiator' | 'recipient';
  session: MatchSessionSummary;
};

export type MatchSessionActivityBucket = {
  date: string;
  count: number;
};

export type MatchSessionAnalyticsResponse = {
  generated_at: string;
  total_sessions: number;
  initiated_count: number;
  received_count: number;
  matched_count: number;
  ended_count: number;
  average_length_minutes?: number | null;
  longest_length_minutes?: number | null;
  recent_activity: MatchSessionActivityBucket[];
};

export type RecentMatchSession = MatchSessionSummary;

export type UserReportRecord = {
  reported_user_id: string;
  session_id?: string | null;
};

export type UserBlockRecord = {
  blocked_user_id: string;
};

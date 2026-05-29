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

export type RecentMatchSession = MatchSessionSummary;

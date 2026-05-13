export type AgeVerifiedStatus = "pending" | "self_attested" | "verified" | "rejected"
export type ProfileStatus = "pending" | "active" | "paused" | "banned"
export type ReportReason = "nudity" | "harassment" | "scam" | "underage" | "spam" | "other"
export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed"
export type AdminRole = "moderator" | "lead" | "admin"
export type ModerationEnforcementAction =
  | "warning"
  | "verification_required"
  | "temporary_ban"
  | "permanent_ban"

export interface Profile {
  user_id: string
  display_name: string
  date_of_birth: string
  bio?: string
  avatar_url?: string
  country_code?: string
  age_verified_status: AgeVerifiedStatus
  profile_status: ProfileStatus
  safety_notes?: string
  onboarding_completed_at?: string
  created_at?: string
  updated_at?: string
}

export interface Interest {
  id: string
  name: string
  category?: string
  created_at?: string
}

export interface UserInterest {
  user_id: string
  interest_id: string
  created_at?: string
}

export interface Report {
  id: string
  reporter_user_id: string
  reported_user_id: string
  reason: ReportReason
  details?: string
  evidence_storage_path?: string
  session_id?: string
  status?: ReportStatus
  created_at?: string
}

export interface Block {
  id: string
  blocker_user_id: string
  blocked_user_id: string
  reason?: string
  created_at?: string
}

export interface ModerationProfileSummary {
  user_id: string
  display_name?: string
  avatar_url?: string
  country_code?: string
  profile_status?: string
  age_verified_status?: string
  date_of_birth?: string
}

export interface ModerationSessionSummary {
  id: string
  initiator_user_id: string
  recipient_user_id: string
  status?: string
  started_at?: string
  ended_at?: string
  created_at?: string
}

export interface ModerationEvent {
  id: string
  actor_user_id?: string
  subject_user_id?: string
  event_type: string
  payload: Record<string, unknown>
  actor_admin_user?: AdminUser
  created_at?: string
}

export interface ModerationEnforcementSummary {
  action: ModerationEnforcementAction
  duration_hours?: number
  note?: string
  actor_admin_user?: AdminUser
  report_id?: string
  created_at?: string
}

export interface AdminUser {
  id: string
  username: string
  display_name?: string
  role: AdminRole
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface ModerationReport extends Report {
  reporter_profile?: ModerationProfileSummary
  reported_profile?: ModerationProfileSummary
  session?: ModerationSessionSummary
  events?: ModerationEvent[]
  current_assignee?: string
  current_assignee_admin_user_id?: string
  current_assignee_admin_user?: AdminUser
  latest_enforcement?: ModerationEnforcementSummary
}

export interface ModerationBlock extends Block {
  blocker_profile?: ModerationProfileSummary
  blocked_profile?: ModerationProfileSummary
}

export interface SessionUser {
  id: string
  email?: string
  phone?: string
  email_confirmed_at?: string
}

export interface SessionState {
  user: SessionUser
  profile_exists: boolean
  onboarding_complete: boolean
}

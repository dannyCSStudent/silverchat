export type ClientStatus = "lead" | "active" | "completed"

export interface Client {
  id: string
  name: string
  phone?: string
  email?: string
  profile_image_url?: string
  banner_image_url?: string
  status: ClientStatus
  notes?: string
  last_contacted_at?: string
  owner_user_id?: string
  created_at?: string
  updated_at?: string
  tags?: ClientTag[]
}

export type ClientInteractionType = "call" | "email" | "meeting" | "note" | "follow_up"

export interface ClientActivity {
  id: string
  client_id: string
  interaction_type: ClientInteractionType
  notes?: string
  timestamp: string
  created_by?: string
}

export type UserRole = "admin" | "staff" | "viewer"

export interface UserRoleAssignment {
  user_id: string
  role: UserRole
}

export interface ClientTag {
  id: string
  name: string
  color: string
}

export interface ClientTagAssignment {
  client_id: string
  tag_id: string
  created_at?: string
}

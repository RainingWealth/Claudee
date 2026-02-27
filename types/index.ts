// ─── Contact / WhatsApp CRM ──────────────────────────────────────────────────

export type LeadStatus = 'new' | 'contacted' | 'responded' | 'qualified' | 'closed'
export type MessageDirection = 'inbound' | 'outbound'
export type MessageType = 'text' | 'template' | 'image' | 'audio'
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed'
export type SentBy = 'bot' | 'human'
export type ContactSource = 'meta_ads' | 'manual' | 'csv'

export interface Contact {
  id: string
  phone: string
  name: string | null
  email: string | null
  status: LeadStatus
  bot_enabled: boolean
  last_message_at: string | null
  last_response_at: string | null
  re_engagement_interval_days: number
  next_engagement_at: string | null
  lead_score: number
  source: ContactSource
  meta_lead_id: string | null
  campaign_tag: string | null
  notes: string | null
  created_at: string
}

export interface Message {
  id: string
  contact_id: string
  direction: MessageDirection
  content: string
  message_type: MessageType
  ultramsg_message_id: string | null
  status: MessageStatus
  sent_by: SentBy
  created_at: string
}

export interface MessageTemplate {
  id: string
  name: string
  category: 'welcome' | 'followup' | 'reengagement' | 'custom'
  content: string
  variables: string[]
  active: boolean
  created_at: string
}

// ─── Voice Campaigns ─────────────────────────────────────────────────────────

export type CampaignStatus = 'draft' | 'running' | 'paused' | 'completed'
export type VoiceLeadStatus =
  | 'pending'
  | 'calling'
  | 'answered'
  | 'no_answer'
  | 'busy'
  | 'failed'
  | 'do_not_call'

export interface VoiceCampaign {
  id: string
  name: string
  status: CampaignStatus
  operating_hours_start: string | null // "09:00"
  operating_hours_end: string | null   // "17:00"
  timezone: string
  max_concurrent_calls: number
  retell_agent_id: string
  total_numbers: number
  called_count: number
  answered_count: number
  failed_count: number
  active_calls: number
  created_at: string
  updated_at: string
}

export interface VoiceLead {
  id: string
  campaign_id: string
  phone: string
  name: string | null
  status: VoiceLeadStatus
  retell_call_id: string | null
  recording_url: string | null
  transcript: string | null
  called_at: string | null
  duration_seconds: number | null
  call_metadata: Record<string, unknown> | null
  created_at: string
}

// ─── DNC / Notifications ─────────────────────────────────────────────────────

export type DncChannel = 'whatsapp' | 'voice' | 'all'

export interface DoNotContact {
  id: string
  phone: string
  channel: DncChannel
  reason: string | null
  added_at: string
}

export interface Notification {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  metadata: Record<string, unknown> | null
  created_at: string
}

// ─── Settings ────────────────────────────────────────────────────────────────

export interface AppSettings {
  id: number
  ultramsg_instance_id: string | null
  ultramsg_token: string | null
  meta_verify_token: string | null
  meta_access_token: string | null
  meta_page_id: string | null
  retell_api_key: string | null
  default_re_engagement_days: number
  welcome_template_id: string | null
  reengagement_template_id: string | null
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface AnalyticsStats {
  whatsapp: {
    total_contacts: number
    bot_active_contacts: number
    messages_sent_today: number
    response_rate: number
    contacts_by_status: Record<LeadStatus, number>
  }
  voice: {
    total_campaigns: number
    active_campaigns: number
    calls_today: number
    answer_rate: number
    active_calls_now: number
  }
}

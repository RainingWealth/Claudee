-- AI Agency Platform — Supabase Database Schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New Query)

-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Enums ───────────────────────────────────────────────────────────────────
do $$ begin
  create type lead_status as enum ('new', 'contacted', 'responded', 'qualified', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type message_direction as enum ('inbound', 'outbound');
exception when duplicate_object then null; end $$;

do $$ begin
  create type message_type as enum ('text', 'template', 'image', 'audio');
exception when duplicate_object then null; end $$;

do $$ begin
  create type message_status as enum ('sent', 'delivered', 'read', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sent_by as enum ('bot', 'human');
exception when duplicate_object then null; end $$;

do $$ begin
  create type contact_source as enum ('meta_ads', 'manual', 'csv');
exception when duplicate_object then null; end $$;

do $$ begin
  create type template_category as enum ('welcome', 'followup', 'reengagement', 'custom');
exception when duplicate_object then null; end $$;

do $$ begin
  create type campaign_status as enum ('draft', 'running', 'paused', 'completed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type voice_lead_status as enum ('pending', 'calling', 'answered', 'no_answer', 'busy', 'failed', 'do_not_call');
exception when duplicate_object then null; end $$;

do $$ begin
  create type dnc_channel as enum ('whatsapp', 'voice', 'all');
exception when duplicate_object then null; end $$;

-- ─── Contacts ────────────────────────────────────────────────────────────────
create table if not exists contacts (
  id                          uuid primary key default uuid_generate_v4(),
  phone                       text not null unique,
  name                        text,
  email                       text,
  status                      lead_status not null default 'new',
  bot_enabled                 boolean not null default true,
  last_message_at             timestamptz,
  last_response_at            timestamptz,
  re_engagement_interval_days int not null default 2,
  next_engagement_at          timestamptz,
  lead_score                  int not null default 0,
  source                      contact_source not null default 'manual',
  meta_lead_id                text,
  campaign_tag                text,
  notes                       text,
  created_at                  timestamptz not null default now()
);

create index if not exists idx_contacts_phone on contacts(phone);
create index if not exists idx_contacts_status on contacts(status);
create index if not exists idx_contacts_bot_enabled on contacts(bot_enabled);
create index if not exists idx_contacts_next_engagement on contacts(next_engagement_at);

-- ─── Messages ────────────────────────────────────────────────────────────────
create table if not exists messages (
  id                    uuid primary key default uuid_generate_v4(),
  contact_id            uuid not null references contacts(id) on delete cascade,
  direction             message_direction not null,
  content               text not null,
  message_type          message_type not null default 'text',
  ultramsg_message_id   text,
  status                message_status not null default 'sent',
  sent_by               sent_by not null default 'human',
  created_at            timestamptz not null default now()
);

create index if not exists idx_messages_contact_id on messages(contact_id);
create index if not exists idx_messages_created_at on messages(created_at desc);

-- ─── Message Templates ───────────────────────────────────────────────────────
create table if not exists message_templates (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  category    template_category not null default 'custom',
  content     text not null,
  variables   jsonb not null default '[]',
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ─── Voice Campaigns ─────────────────────────────────────────────────────────
create table if not exists voice_campaigns (
  id                      uuid primary key default uuid_generate_v4(),
  name                    text not null,
  status                  campaign_status not null default 'draft',
  operating_hours_start   time,
  operating_hours_end     time,
  timezone                text not null default 'UTC',
  max_concurrent_calls    int not null default 3,
  retell_agent_id         text not null,
  total_numbers           int not null default 0,
  called_count            int not null default 0,
  answered_count          int not null default 0,
  failed_count            int not null default 0,
  active_calls            int not null default 0,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists idx_voice_campaigns_status on voice_campaigns(status);

-- ─── Voice Leads ─────────────────────────────────────────────────────────────
create table if not exists voice_leads (
  id                uuid primary key default uuid_generate_v4(),
  campaign_id       uuid not null references voice_campaigns(id) on delete cascade,
  phone             text not null,
  name              text,
  status            voice_lead_status not null default 'pending',
  retell_call_id    text,
  recording_url     text,
  transcript        text,
  called_at         timestamptz,
  duration_seconds  int,
  call_metadata     jsonb,
  created_at        timestamptz not null default now()
);

create index if not exists idx_voice_leads_campaign_id on voice_leads(campaign_id);
create index if not exists idx_voice_leads_status on voice_leads(status);
create index if not exists idx_voice_leads_phone on voice_leads(phone);

-- ─── Do Not Contact ──────────────────────────────────────────────────────────
create table if not exists do_not_contact (
  id        uuid primary key default uuid_generate_v4(),
  phone     text not null unique,
  channel   dnc_channel not null default 'all',
  reason    text,
  added_at  timestamptz not null default now()
);

-- ─── Notifications ───────────────────────────────────────────────────────────
create table if not exists notifications (
  id          uuid primary key default uuid_generate_v4(),
  type        text not null,
  title       text not null,
  body        text not null,
  read        boolean not null default false,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_notifications_read on notifications(read);
create index if not exists idx_notifications_created_at on notifications(created_at desc);

-- ─── Settings ────────────────────────────────────────────────────────────────
create table if not exists settings (
  id                          int primary key default 1 check (id = 1),  -- single row
  ultramsg_instance_id        text,
  ultramsg_token              text,
  meta_verify_token           text,
  meta_access_token           text,
  meta_page_id                text,
  retell_api_key              text,
  default_re_engagement_days  int not null default 2,
  welcome_template_id         uuid references message_templates(id),
  reengagement_template_id    uuid references message_templates(id)
);

-- Insert default settings row
insert into settings (id) values (1) on conflict (id) do nothing;

-- ─── Realtime ────────────────────────────────────────────────────────────────
-- Enable Realtime for live updates in the UI
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table contacts;
alter publication supabase_realtime add table voice_campaigns;
alter publication supabase_realtime add table voice_leads;
alter publication supabase_realtime add table notifications;

-- ─── Row Level Security ──────────────────────────────────────────────────────
-- Disable RLS for internal agency tool (single-tenant)
-- Enable this block if you add multi-tenant auth later
-- alter table contacts enable row level security;
-- alter table messages enable row level security;
-- ...

-- DirectorOS prototype baseline.
--
-- This migration reproduces the current executive_briefs table required by the
-- application. It intentionally does not add identity, tenancy, RLS, or change
-- existing application behavior. Those changes begin in IDF-003 and IDF-004.

create extension if not exists pgcrypto;

create table if not exists public.executive_briefs (
  id uuid primary key default gen_random_uuid(),
  source_message_id text,
  received_at timestamptz,
  sender text,
  recipients text,
  subject text,
  body_text text,
  has_attachments boolean not null default false,
  priority text,
  client text,
  category text,
  deadline text,
  estimated_effort text,
  executive_summary text,
  action_items text,
  decisions_required text,
  risks text,
  suggested_reply text,
  raw_ai_output jsonb,
  created_at timestamptz not null default now()
);

create index if not exists executive_briefs_received_at_idx
  on public.executive_briefs (received_at desc);

create unique index if not exists executive_briefs_source_message_id_uidx
  on public.executive_briefs (source_message_id)
  where source_message_id is not null;

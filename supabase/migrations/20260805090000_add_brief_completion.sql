alter table public.executive_briefs
  add column if not exists completed_at timestamptz;

create index if not exists executive_briefs_completed_at_idx
  on public.executive_briefs (completed_at)
  where completed_at is not null;

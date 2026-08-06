alter table public.executive_briefs
  add column if not exists pinned boolean not null default false;

create index if not exists executive_briefs_pinned_idx
  on public.executive_briefs (pinned, received_at desc)
  where pinned = true;

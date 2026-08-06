alter table public.executive_briefs
  add column if not exists snooze_until timestamptz;

create index if not exists executive_briefs_snooze_until_idx
  on public.executive_briefs (snooze_until)
  where snooze_until is not null;

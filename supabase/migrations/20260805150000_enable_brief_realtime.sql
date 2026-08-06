do $$
begin
  alter publication supabase_realtime add table public.executive_briefs;
exception
  when duplicate_object then null;
end
$$;

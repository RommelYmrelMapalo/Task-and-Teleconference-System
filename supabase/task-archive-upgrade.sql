alter table public.tasks
add column if not exists archived_at timestamptz;

create index if not exists tasks_archived_at_created_idx
on public.tasks (archived_at, created_at desc);

create index if not exists tasks_retention_lookup_idx
on public.tasks (archived_at, last_edited_at);

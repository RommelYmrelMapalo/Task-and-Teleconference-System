create table if not exists public.inbox_thread_states (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  thread_key text not null,
  trashed_at timestamptz,
  deleted_before timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, thread_key)
);

create index if not exists inbox_thread_states_user_idx
on public.inbox_thread_states (user_id, thread_key);

alter table public.inbox_thread_states enable row level security;

drop policy if exists "inbox_thread_states_owner_or_admin" on public.inbox_thread_states;
create policy "inbox_thread_states_owner_or_admin"
on public.inbox_thread_states
for all
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

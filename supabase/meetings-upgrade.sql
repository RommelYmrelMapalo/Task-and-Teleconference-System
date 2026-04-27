create table if not exists public.meetings (
  id bigint generated always as identity primary key,
  title text not null,
  description text,
  room text,
  scheduled_for timestamptz not null,
  ends_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > scheduled_for)
);

create table if not exists public.meeting_assignments (
  meeting_id bigint not null references public.meetings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (meeting_id, user_id)
);

create index if not exists meetings_scheduled_for_idx
on public.meetings (scheduled_for);

create index if not exists meeting_assignments_user_idx
on public.meeting_assignments (user_id, meeting_id);

alter table public.meetings enable row level security;
alter table public.meeting_assignments enable row level security;

drop policy if exists "meetings_authenticated_select" on public.meetings;
create policy "meetings_authenticated_select"
on public.meetings
for select
using (auth.uid() is not null);

drop policy if exists "meetings_admin_write" on public.meetings;
create policy "meetings_admin_write"
on public.meetings
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "meeting_assignments_authenticated_select" on public.meeting_assignments;
create policy "meeting_assignments_authenticated_select"
on public.meeting_assignments
for select
using (auth.uid() is not null);

drop policy if exists "meeting_assignments_admin_write" on public.meeting_assignments;
create policy "meeting_assignments_admin_write"
on public.meeting_assignments
for all
using (public.is_admin())
with check (public.is_admin());

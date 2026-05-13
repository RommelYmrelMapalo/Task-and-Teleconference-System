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

create table if not exists public.meeting_attendance (
  id bigint generated always as identity primary key,
  meeting_id bigint not null references public.meetings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz,
  left_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (meeting_id, user_id),
  check (left_at is null or joined_at is null or left_at >= joined_at)
);

alter table public.meetings
add column if not exists title text;

alter table public.meetings
add column if not exists description text;

alter table public.meetings
add column if not exists room text;

alter table public.meetings
add column if not exists scheduled_for timestamptz;

alter table public.meetings
add column if not exists ends_at timestamptz;

alter table public.meetings
add column if not exists created_by uuid references public.profiles(id) on delete set null;

alter table public.meetings
add column if not exists updated_at timestamptz not null default now();

alter table public.meetings
add column if not exists created_at timestamptz not null default now();

alter table public.meeting_assignments
add column if not exists created_at timestamptz not null default now();

alter table public.meeting_attendance
add column if not exists joined_at timestamptz;

alter table public.meeting_attendance
add column if not exists left_at timestamptz;

alter table public.meeting_attendance
add column if not exists created_at timestamptz not null default now();

alter table public.meeting_attendance
add column if not exists updated_at timestamptz not null default now();

create index if not exists meetings_scheduled_for_idx
on public.meetings (scheduled_for);

create index if not exists meeting_assignments_user_idx
on public.meeting_assignments (user_id, meeting_id);

create index if not exists meeting_attendance_user_idx
on public.meeting_attendance (user_id, meeting_id);

alter table public.meetings enable row level security;
alter table public.meeting_assignments enable row level security;
alter table public.meeting_attendance enable row level security;

drop policy if exists "meetings_authenticated_select" on public.meetings;
create policy "meetings_authenticated_select"
on public.meetings
for select
using (auth.uid() is not null);

drop policy if exists "meetings_admin_write" on public.meetings;
drop policy if exists "meetings_authenticated_write" on public.meetings;
create policy "meetings_authenticated_write"
on public.meetings
for all
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop policy if exists "meeting_assignments_authenticated_select" on public.meeting_assignments;
create policy "meeting_assignments_authenticated_select"
on public.meeting_assignments
for select
using (auth.uid() is not null);

drop policy if exists "meeting_assignments_admin_write" on public.meeting_assignments;
drop policy if exists "meeting_assignments_authenticated_write" on public.meeting_assignments;
create policy "meeting_assignments_authenticated_write"
on public.meeting_assignments
for all
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop policy if exists "meeting_attendance_owner_or_admin" on public.meeting_attendance;
create policy "meeting_attendance_owner_or_admin"
on public.meeting_attendance
for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "meeting_attendance_insert_self_or_admin" on public.meeting_attendance;
create policy "meeting_attendance_insert_self_or_admin"
on public.meeting_attendance
for insert
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "meeting_attendance_update_self_or_admin" on public.meeting_attendance;
create policy "meeting_attendance_update_self_or_admin"
on public.meeting_attendance
for update
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

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

create index if not exists meeting_attendance_user_idx
on public.meeting_attendance (user_id, meeting_id);

alter table public.meeting_attendance enable row level security;

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

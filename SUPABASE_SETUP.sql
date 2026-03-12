create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null default '',
  is_admin boolean not null default false,
  role text not null default 'user' check (role in ('user', 'admin')),
  last_login timestamptz,
  created_at timestamptz not null default now()
);

create table public.notes (
  id bigint generated always as identity primary key,
  data text,
  created_at timestamptz not null default now(),
  user_id uuid not null references public.profiles(id) on delete cascade
);

create table public.notifications (
  id bigint generated always as identity primary key,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  user_id uuid not null references public.profiles(id) on delete cascade
);

create table public.tasks (
  id bigint generated always as identity primary key,
  title text not null,
  description text,
  status text not null default 'assigned'
    check (status in ('assigned', 'in_progress', 'for_revision', 'completed')),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high')),
  deadline timestamptz,
  created_by uuid not null references public.profiles(id),
  last_edited_by uuid references public.profiles(id),
  last_edited_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.tasks
add column if not exists created_by uuid references public.profiles(id);

update public.tasks
set created_by = coalesce(
  created_by,
  last_edited_by,
  (
    select task_assignments.user_id
    from public.task_assignments
    where task_assignments.task_id = tasks.id
    order by task_assignments.user_id
    limit 1
  )
)
where created_by is null;

create table public.task_assignments (
  task_id bigint not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (task_id, user_id)
);

create table public.task_attachments (
  id bigint generated always as identity primary key,
  task_id bigint not null references public.tasks(id) on delete cascade,
  filename text not null,
  mimetype text,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_admin = true
  );
$$;

alter table public.profiles enable row level security;
alter table public.notes enable row level security;
alter table public.notifications enable row level security;
alter table public.tasks enable row level security;
alter table public.task_assignments enable row level security;
alter table public.task_attachments enable row level security;

create policy "profiles_select_self_or_admin"
on public.profiles
for select
using (id = auth.uid() or public.is_admin());

create policy "profiles_update_self_or_admin"
on public.profiles
for update
using (id = auth.uid() or public.is_admin());

create policy "notes_owner_or_admin"
on public.notes
for all
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy "notifications_owner_or_admin"
on public.notifications
for all
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy "tasks_assignee_or_admin_select"
on public.tasks
for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.task_assignments
    where task_id = tasks.id
      and user_id = auth.uid()
  )
);

create policy "tasks_admin_write"
on public.tasks
for all
using (public.is_admin())
with check (public.is_admin());

create policy "task_assignments_assignee_or_admin_select"
on public.task_assignments
for select
using (user_id = auth.uid() or public.is_admin());

create policy "task_assignments_admin_write"
on public.task_assignments
for all
using (public.is_admin())
with check (public.is_admin());

create policy "task_attachments_assignee_or_admin_select"
on public.task_attachments
for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.task_assignments
    where task_assignments.task_id = task_attachments.task_id
      and task_assignments.user_id = auth.uid()
  )
);

create policy "task_attachments_admin_write"
on public.task_attachments
for all
using (public.is_admin())
with check (public.is_admin());

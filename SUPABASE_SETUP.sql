create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  is_admin boolean not null default false,
  role text not null default 'user' check (role in ('user', 'admin')),
  last_login timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.normalize_profile_email()
returns trigger
language plpgsql
as $$
begin
  new.email := lower(trim(coalesce(new.email, '')));
  return new;
end;
$$;

drop trigger if exists normalize_profile_email on public.profiles;

create trigger normalize_profile_email
before insert or update of email on public.profiles
for each row execute procedure public.normalize_profile_email();

do $$
begin
  if exists (
    select 1
    from public.profiles
    group by lower(trim(email))
    having count(*) > 1
  ) then
    raise exception 'Cannot enforce case-insensitive email uniqueness until duplicate emails are removed.';
  end if;
end;
$$;

update public.profiles
set email = lower(trim(email))
where email is distinct from lower(trim(email));

alter table public.profiles
drop constraint if exists profiles_email_key;

create unique index if not exists profiles_email_lower_unique
on public.profiles (lower(email));

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

create table if not exists public.task_audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid not null references public.profiles(id) on delete cascade,
  task_id bigint not null references public.tasks(id) on delete cascade,
  action text not null,
  details text,
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
    lower(trim(coalesce(new.email, ''))),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;

create or replace function public.handle_auth_user_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set email = lower(trim(coalesce(new.email, '')))
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
after update of email on auth.users
for each row execute procedure public.handle_auth_user_updated();

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
alter table public.task_audit_logs enable row level security;

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

create policy "tasks_authenticated_select"
on public.tasks
for select
using (auth.uid() is not null);

create policy "tasks_admin_write"
on public.tasks
for all
using (public.is_admin())
with check (public.is_admin());

create policy "task_assignments_authenticated_select"
on public.task_assignments
for select
using (auth.uid() is not null);

create policy "task_assignments_admin_write"
on public.task_assignments
for all
using (public.is_admin())
with check (public.is_admin());

create policy "task_attachments_authenticated_select"
on public.task_attachments
for select
using (auth.uid() is not null);

create policy "task_attachments_admin_write"
on public.task_attachments
for all
using (public.is_admin())
with check (public.is_admin());

create policy "task_audit_logs_admin_select"
on public.task_audit_logs
for select
using (public.is_admin());

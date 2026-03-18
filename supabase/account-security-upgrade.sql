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

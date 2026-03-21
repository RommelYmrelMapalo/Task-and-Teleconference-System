alter table public.notifications
add column if not exists sender_user_id uuid references public.profiles(id) on delete set null;

alter table public.notifications
add column if not exists thread_key text;

alter table public.notifications
add column if not exists task_id bigint references public.tasks(id) on delete set null;

update public.notifications
set thread_key = concat('notification:', id)
where thread_key is null;

create index if not exists notifications_user_unread_idx
on public.notifications (user_id, is_read, created_at desc);

create index if not exists notifications_thread_idx
on public.notifications (thread_key, created_at);

drop policy if exists "notifications_sender_select" on public.notifications;
create policy "notifications_sender_select"
on public.notifications
for select
using (sender_user_id = auth.uid());

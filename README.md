This is a Next.js TTCS app backed by Supabase auth and database queries.

## Supabase setup

1. Create a Supabase project.
2. In the Supabase SQL editor, run [`SUPABASE_SETUP.sql`](./SUPABASE_SETUP.sql).
   Existing projects can apply [`supabase/account-security-upgrade.sql`](./supabase/account-security-upgrade.sql) to add case-insensitive email uniqueness and profile email sync.
3. Copy [`.env.example`](./.env.example) to `.env.local` and fill in your project values.
4. Install dependencies:

```bash
npm install
```

5. Start the app:

```bash
npm run dev
```

## Connection points

- Browser client: `app/utils/utils/supabase/client.ts`
- Server client: `app/utils/utils/supabase/server.ts`
- Session refresh proxy: `proxy.ts`
- Email auth callback: `app/auth/callback/route.ts`
- Shared data layer: `lib/ttcs-data.ts`
- Login UI: `app/page.tsx`
- Sign-up UI: `app/sign-up/page.tsx`

## Email template

For the Supabase "Confirm signup" email, use [`supabase/email-templates/confirm-signup.html`](./supabase/email-templates/confirm-signup.html) in the Supabase dashboard under Authentication -> Email Templates.

## Inbox threads

Task assignments can be handled directly inside TTCS inbox threads. Apply [`supabase/inbox-thread-upgrade.sql`](./supabase/inbox-thread-upgrade.sql) to let admins and assigned users reply to each other in the inbox while keeping assignment notices grouped by task. Apply [`supabase/inbox-trash-upgrade.sql`](./supabase/inbox-trash-upgrade.sql) to add per-user trash with 31-day retention for inbox threads.

## Task retention

Tasks are automatically removed after 31 days without edits. The app enforces this lazily before task pages, task mutations, and task attachment downloads, using each task's `last_edited_at` timestamp as the inactivity cutoff.

## Current coverage

- Auth, session redirects, and logout use Supabase.
- User dashboard, tasks, inbox, profile, meetings, and admin pages read from Supabase.
- Meeting time-in and time-out now rely on the `meeting_attendance` table, which is filled automatically when a user joins and leaves a meeting room through TTCS.

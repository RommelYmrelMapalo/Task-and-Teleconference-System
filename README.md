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

## Current coverage

- Auth, session redirects, and logout use Supabase.
- User dashboard, tasks, inbox, profile, meetings, and admin pages read from Supabase.
- The remaining schema gap is attendance logging for time-in/time-out and any richer meeting model beyond notification-derived meeting notices.

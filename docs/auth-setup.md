# Supabase Auth Setup

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key from **Settings > API**

## 2. Configure Environment Variables

Add these to your `.env.local` at the repo root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key

# Also needed for the API server (apps/api)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-role-key
```

## 3. Enable Auth Providers

In Supabase Dashboard > Authentication > Providers:

- **Email**: Enable email/password sign-up
- **Magic Link**: Enabled by default with email provider

## 4. Configure Redirect URLs

In Supabase Dashboard > Authentication > URL Configuration:

- **Site URL**: `http://localhost:3000`
- **Redirect URLs**: Add `http://localhost:3000/auth/callback`

For production, add your production domain as well.

## 5. Run the Database Migration

```bash
# Apply the schema (tables, RLS, indexes)
supabase db push
# or
supabase migration up
```

## 6. Start Development

```bash
# Start the API server
pnpm -F @trip-planner/api dev

# Start the web app
pnpm -F @trip-planner/web dev
```

Visit `http://localhost:3000`:
- Landing page at `/`
- Login/sign-up at `/login`
- Protected app at `/app` (redirects to `/login` if not authenticated)

## Architecture

### Session Strategy

Uses **cookie-based sessions** via `@supabase/ssr`:

- **Middleware** (`apps/web/middleware.ts`): Intercepts requests to `/app/*` and `/login`, checks Supabase session cookie, redirects accordingly
- **Browser client** (`src/lib/supabase.ts`): Used in client components for auth actions (sign in, sign up, sign out)
- **Server client** (`src/lib/supabase-server.ts`): Used in server components/route handlers to read session

### Auth Flow

1. User visits `/login` and enters credentials
2. Supabase Auth validates and sets session cookies
3. Middleware allows access to `/app` routes
4. Sign out clears cookies and redirects to `/`

### Magic Link Flow

1. User enters email and clicks "Send magic link"
2. Supabase sends email with auth link
3. Link redirects to `/auth/callback` route handler
4. Route handler exchanges code for session, sets cookies
5. User is redirected to `/app`

## Caveats

- The anon key is safe to expose in the browser (it's a public key)
- The service role key must NEVER be exposed to the client
- Session refresh happens automatically via Supabase middleware
- For production, ensure your Supabase project's JWT expiry and refresh settings are appropriate

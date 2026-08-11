# Auth Identity Resolution and Email-based RLS

In this project, `auth.users.id` (from `auth.uid()`) does not match `public.users.id` for any user, causing standard UUID-based RLS policies to fail silently. We decided that email is the only reliable bridge between these tables, so all mobile RLS policies and identity resolutions must resolve ownership via the user's email (e.g. `WHERE u.email::text = auth.email()`). This ensures correct permissioning while relying exclusively on the Anon key.

## Consequences

- Mobile auth relies exclusively on the Anon key + RLS. The service role key is never used on mobile.
- `fetchAppUserProfile()` and other auth-dependent functions resolve by `auth.email()` against `public.users.email`.
- Developers must be explicitly aware that `auth.uid()` cannot be used for relational lookups in this project.

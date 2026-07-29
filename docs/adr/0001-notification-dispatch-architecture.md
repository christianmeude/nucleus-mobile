# Notification dispatch via DB Webhook → Edge Function, not client-side invocation

Email and push notifications for faculty review actions are dispatched server-side via a Supabase DB Webhook on `notifications` INSERT, invoking a `notify-review-action` Edge Function. The Edge Function uses Resend for email and Expo Push Notifications Service for push, both via raw `fetch` (no npm dependencies). We chose this over having the mobile client invoke the Edge Function directly because the webhook fires regardless of whether the INSERT came from the mobile app or the web Express backend — it is the only architecture that covers both callers without changing either caller's data path. The web Express backend must stop sending its own SMTP for review events; the Edge Function owns all outbound email and push for these events.

## Considered Options

- **Client-side invocation (rejected):** The mobile client calls `supabase.functions.invoke()` after the RPC succeeds. Rejected because it only covers mobile — the web backend would still send its own email separately, creating a double-send problem with no clean resolution. It also ties dispatch reliability to client network availability.
- **DB Webhook → Edge Function (chosen):** A single server-side trigger covers all callers. The web backend removes its own sends; the Edge Function becomes the sole owner of outbound notifications for review events.

## Consequences

- The web Express backend (`backend/src/controllers/review.controller.js`) must remove `sendPaperStatusEmail` / `sendReviewAssignmentEmail` calls for faculty review events before this ships. This is an explicit acceptance criterion on Issue #9.
- A `notified_at timestamptz` column on `notifications` acts as an atomic idempotency guard against at-least-once webhook delivery.
- A `push_tokens` table (new) is required to persist `ExpoPushToken` values server-side for lookup by the Edge Function.
- Sending domain `nu-dasma.edu.ph` must be verified in Resend before production deploy.

# Notification Architecture Research — Issue #9
*Generated: 2026-07-29 | Researcher: subagent | Ticket: wayfinder #102*

---

## ⚡ Recommendation (read this first)

**Choose Architecture A: Supabase DB Webhook → Edge Function, triggered on INSERT into the `notifications` table.**

**Services: Resend (email) + Expo Push Notifications Service (push).**

### Rationale in brief

| Concern | DB Webhook (A) | Direct client invocation (B) |
|---|---|---|
| No service-role key on client | ✅ webhook fires server-side | ✅ anon-key invocation works |
| Both web + mobile covered | ✅ one trigger regardless of caller | ⚠️ requires mobile to call AND web to stop calling |
| Double-send risk | ⚠️ at-least-once delivery (mitigated — see §4) | ✅ one call per action (but web still sends separately) |
| Existing RPC unchanged | ✅ piggybacks on current `faculty_notify_paper_parties` inserts | ⚠️ would need RPC or client change |
| Web express backend still sends | handled: web stops sending email, Edge Function takes over | complicated: two systems still send unless web is changed |

The webhook approach is the **only option that covers both web and mobile without changing the web backend's data path**. The RPCs (`faculty_approve_paper`, `faculty_request_revision`, `faculty_reject_paper`) already INSERT into `notifications` via `faculty_notify_paper_parties`. A webhook on `notifications` INSERT fires once per row, regardless of whether the INSERT came from mobile or web. The web Express backend must be modified to stop its own email sends and defer to the Edge Function — this is unavoidable regardless of architecture choice.

**Double-send prevention:** Use a `notified_at` timestamp column on the `notifications` row (set by the Edge Function after sending). The function updates `notifications SET notified_at = now()` only after successful email/push dispatch; a second webhook delivery checks `notified_at IS NOT NULL` and exits early. This is simpler and more robust than Resend idempotency keys for this use case.

---

## 1. Trigger Mechanism: DB Webhook vs. Direct Invocation

### Architecture A — Supabase DB Webhook → Edge Function

**How it works:**
1. The existing RPCs (`faculty_approve_paper` etc.) call `faculty_notify_paper_parties`, which INSERTs rows into `public.notifications`.
2. A Supabase Database Webhook is configured on `public.notifications`, event `INSERT`.
3. Each INSERT fires an async HTTP POST (via `pg_net`) to the `notify-review-action` Edge Function.
4. The Edge Function reads the notification payload, queries the user's email + push tokens, and dispatches email + push.

**Supabase DB Webhook mechanics** ([docs](https://supabase.com/docs/guides/database/webhooks)):
- Configured in Dashboard → Database → Webhooks, or via `pg_net` in migrations.
- Listens to `INSERT`, `UPDATE`, `DELETE` events on any table.
- Payload shape: `{ type: "INSERT", table: "notifications", schema: "public", record: { ...new_row }, old_record: null }`.
- Executes **asynchronously** via the `pg_net` extension — does **not** block the database transaction.
- Reliability: **at-least-once delivery** (see §4 for double-send mitigation).
- The webhook sends a `service_role` key in the `Authorization` header to the Edge Function (this is server→server, not client-facing; the service role key stays entirely server-side).
- Latency: typically sub-second to a few seconds after commit.

**Source:** [supabase.com/docs/guides/database/webhooks](https://supabase.com/docs/guides/database/webhooks)

**Does this risk double-sending if web and mobile both act?**
No — the RPCs enforce `status = 'pending_faculty'` as a gate. Only one actor can win the RPC (the first one updates the status, the second one hits `Paper not found, not assigned to you, or not awaiting your review`). So only one set of `notifications` INSERTs happens per review action. The double-send risk is from **webhook at-least-once retry** (mitigated in §4), not from two clients triggering simultaneously.

### Architecture B — Mobile client invokes Edge Function directly

**How it works:**
- After the RPC succeeds, the mobile client calls `supabase.functions.invoke('notify-review-action', {...})`.
- The Edge Function receives the caller's JWT (user session), verifies it, then sends email + push.

**Edge Function caller authentication:**
- When `supabase.functions.invoke()` is called, the Supabase JS client **automatically sends the user's JWT** in the `Authorization` header.
- The Edge Function can verify this with `withSupabase({ auth: 'user' })` or manual `supabase.auth.getUser(token)`.
- **No service-role key is needed on the client** — the anon key + user JWT is sufficient.
- Source: Supabase Edge Functions auth docs — `auth: 'user'` mode scopes the function to the caller's RLS context.

**Why Architecture B is still problematic:**
- It only covers mobile. The web Express backend's email sends would still need to be removed/replaced separately.
- If mobile fails to call the function (network error, crash after RPC success), no email is sent.
- More call surface: the client now has two responsibilities (RPC + function invoke).

**Supabase's stance:** The official Supabase example for "send email on database event" always uses DB Webhooks, not client-side invocation. Client invocation is documented for user-initiated actions (form submit, etc.), not system events.

**Verdict:** Use Architecture A (DB Webhook). It is the canonical pattern, covers both web and mobile, and decouples dispatch from client reliability.

---

## 2. Email Provider — Resend

### Resend in a Deno/Edge Function environment

The Resend Node.js SDK works in Deno via the `npm:` specifier (Deno's native npm interop). No fetch-workaround is needed — the SDK is the recommended approach.

**Import and send call (Deno/Edge Function):**
```typescript
import { Resend } from 'npm:resend';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const { data, error } = await resend.emails.send({
  from: 'NUcleus <notifications@yourdomain.edu.ph>',
  to: ['author@example.com'],
  subject: 'Research Approved',
  html: '<p>Your research "<strong>Title</strong>" has been approved.</p>',
});
```

Store `RESEND_API_KEY` via `supabase secrets set RESEND_API_KEY=re_...`.

**Alternatively (zero dependencies, raw fetch):**
```typescript
const res = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
  },
  body: JSON.stringify({ from, to, subject, html }),
});
```
The raw `fetch` approach is simpler for an Edge Function since you avoid SDK cold-start overhead and Deno npm resolution. Either works.

**Supabase + Resend integration guide:** [resend.com/docs/send-with-supabase-edge-functions](https://resend.com/docs/send-with-supabase-edge-functions)
- Official Resend docs have a step-by-step guide: create function → set secret → add DB webhook → deploy.
- The guide uses the raw `fetch` approach in its examples (no SDK dependency).

**Pricing and free tier:**
- Free tier: **3,000 emails/month**, **100 emails/day hard cap**, 1 verified domain, 30-day log retention.
- For a capstone project with ~20–50 users, this is more than sufficient.
- No overage on free tier — sends stop at the cap.
- Source: [resend.com/pricing](https://resend.com/pricing)

**Deno compatibility confirmed:** Resend explicitly documents Deno/Supabase Edge Function support. Both `npm:resend` and raw `fetch` work. The SDK is confirmed compatible (Deno's npm interop handles it).

---

## 3. Push Provider — Expo Push Notifications

### Server-side push API

**HTTP endpoint:**
```
POST https://exp.host/--/api/v2/push/send
Content-Type: application/json
Accept: application/json
Accept-Encoding: gzip, deflate
```

**Payload shape:**
```json
[
  {
    "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
    "title": "Research Approved",
    "body": "Your research \"Title\" has been approved by your adviser.",
    "data": { "paperId": "uuid", "type": "approval" },
    "sound": "default",
    "priority": "default"
  }
]
```
- `to` is the `ExpoPushToken` obtained client-side.
- Supports batching: send an array of up to 100 messages per request.
- Returns push tickets; you can poll `/api/v2/push/getReceipts` for delivery confirmation.

**Source:** [docs.expo.dev/push-notifications/sending-notifications](https://docs.expo.dev/push-notifications/sending-notifications)

### Client-side token registration

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

async function registerPushToken() {
  if (!Device.isDevice) return; // physical device only
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  // → "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"

  // Persist to Supabase
  await supabase.from('push_tokens').upsert({
    user_id: currentUserId,
    token,
    device_id: Device.deviceName, // or a UUID stored in SecureStore
  });
}
```

**Token must be persisted to the DB.** The token lives client-side (obtained via `getExpoPushTokenAsync`) but must be stored server-side (in a `push_tokens` table) for the Edge Function to look it up.

**Recommended schema:**
```sql
CREATE TABLE public.push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  device_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, token)
);
```
RLS: user can only INSERT/UPDATE/DELETE their own tokens (`user_id = auth.uid()` would fail due to the email-uid mismatch — use SECURITY DEFINER RPC same pattern as other writes, or a webhook-only table accessible to the Edge Function via service role).

**Server-side SDK for Deno:**

Option 1 — Official npm SDK via Deno `npm:` specifier:
```typescript
import { Expo } from 'npm:expo-server-sdk';

const expo = new Expo();
const messages = [{ to: 'ExponentPushToken[...]', body: 'Approved!' }];
const chunks = expo.chunkPushNotifications(messages);
for (const chunk of chunks) {
  const tickets = await expo.sendPushNotificationsAsync(chunk);
}
```

Option 2 — Deno-native port (more stable in Deno edge environments):
```typescript
import { Expo } from 'https://deno.land/x/expo_server_sdk_deno@1.0.1-n3.7.0/index.ts';
```

Option 3 — Raw fetch (zero dependencies, simplest for Edge Function):
```typescript
await fetch('https://exp.host/--/api/v2/push/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
  body: JSON.stringify([{ to: token, title, body, data }]),
});
```
For a small capstone project (no batching complexity needed), **raw fetch is the simplest and most reliable approach**.

**Pricing:**
- Expo Push Notification Service is **completely free** — no per-notification fees, no volume caps (throughput limit: 600/second per project).
- No paid EAS subscription required to use push notifications.
- Optional EAS Access Token (free to obtain) can be added to the Edge Function to prevent unauthorized use of push tokens.
- Source: [expo.dev/eas](https://expo.dev/eas)

---

## 4. Double-Send Prevention

### The problem

The web Express backend currently sends email on the same review events. If the Edge Function also sends email triggered by the `notifications` INSERT, both systems will fire → double email.

Additionally, DB Webhooks use **at-least-once delivery** — a network hiccup can cause the same INSERT to trigger the Edge Function twice.

### Recommended approach: `notified_at` column on `notifications`

**Step 1: Add `notified_at` to the `notifications` table:**
```sql
ALTER TABLE public.notifications
  ADD COLUMN notified_at timestamptz;
```

**Step 2: In the Edge Function, do an atomic claim:**
```typescript
// Claim this notification for processing (atomic update-if-null)
const { data: claimed, error } = await adminClient
  .from('notifications')
  .update({ notified_at: new Date().toISOString() })
  .eq('id', notificationId)
  .is('notified_at', null)   // Only claim if not already processed
  .select('id')
  .single();

if (!claimed) {
  // Already processed — idempotent exit
  return new Response('already notified', { status: 200 });
}

// Now send email + push safely
```
This is an **atomic check-and-set** — only the first delivery of the webhook wins the UPDATE. Any retry sees `notified_at IS NOT NULL` and exits.

**Step 3: Web Express backend stops sending email.**
The web backend must be updated to no longer dispatch its own SMTP for faculty review events — the Edge Function owns all outbound email for these events. This is unavoidable regardless of architecture choice; there is no way to prevent double-send without removing the web-side send.

### Resend idempotency keys (supplementary, not a replacement)

Resend supports `Idempotency-Key` header on the `/emails` endpoint:
```typescript
await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Idempotency-Key': `notification-${notificationId}`,
    'Authorization': `Bearer ${RESEND_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ ... }),
});
```
- If the same key is sent within **24 hours**, Resend returns the original response without re-sending.
- Available on all plans including Free.
- **Limitation:** Only prevents Resend from sending twice — it does not prevent the Edge Function from running twice and making two push sends. Use `notified_at` as the primary guard; Resend idempotency is a belt-and-suspenders addition.

### Summary of double-send prevention

| Risk | Mitigation |
|---|---|
| Webhook fires twice (at-least-once) | `notified_at` atomic claim in Edge Function |
| Web Express also sends email | Web backend stops sending; Edge Function owns all email for review events |
| Resend API retry / network error | `Idempotency-Key: notification-{id}` header on Resend call |
| Push sent twice to same device | Expo Push Service is stateless; `notified_at` guard prevents double dispatch |

---

## 5. Supabase Edge Function + Deno Compatibility

### Confirmed: Resend npm SDK works in Deno

Resend explicitly documents Supabase Edge Function support. The `npm:resend` import works via Deno's native npm interop. Raw `fetch` to `https://api.resend.com/emails` also works and is the pattern used in the official Resend + Supabase guide.

Source: [resend.com/docs/send-with-supabase-edge-functions](https://resend.com/docs/send-with-supabase-edge-functions)

### Confirmed: Expo server SDK works in Deno

- `npm:expo-server-sdk` works via `npm:` specifier.
- A Deno-native port exists at `deno.land/x/expo_server_sdk_deno`.
- Raw `fetch` to Expo's HTTP API works without any SDK dependency.
- **Recommendation for this project:** use raw `fetch` for both Resend and Expo — no npm dependencies in the Edge Function, faster cold start, easier to maintain.

### Existing Edge Function pattern in this repo

The project already has 4 deployed Edge Functions (`request-otp`, `verify-otp`, `search-papers`, `embed-papers`). The `request-otp` function (at `supabase/functions/request-otp/index.ts`) uses:
- `import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'`
- `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` for admin operations
- Standard `Deno.serve(async (req) => { ... })` handler

The new `notify-review-action` Edge Function should follow this same pattern. It will receive the webhook payload (service-role bearer from Supabase webhook infrastructure), use an admin client to claim the notification row and look up push tokens, then dispatch email + push via raw fetch.

### Token management for push notifications (new DB table required)

The `push_tokens` table is the only new schema object required. It needs to be readable by the Edge Function (via service role) and writable by authenticated mobile clients. Given the project's email-vs-uid mismatch (ownership resolved by email, not `auth.uid()`), the insert path should use a SECURITY DEFINER RPC — same pattern as `faculty_notify_paper_parties` and `create_faculty_annotation`.

---

## Open decisions for the grilling session

1. **Push token registration UX:** When/where in the app does the user grant push permission and register the token? (App startup? After login? On the Activity screen first visit?) This is a product decision.
2. **Web Express backend coordination:** Who coordinates the change to stop web SMTP sends for faculty events? Is this in scope for this ticket or a parallel ticket?
3. **`push_tokens` RLS + ownership:** Since `auth.uid() != public.users.id` in this project, the push token insert needs a SECURITY DEFINER RPC. Add to the SQL work scope.
4. **Notification fan-out scope:** The webhook fires on every `notifications` INSERT, not just faculty review events. Should the Edge Function only act on `type IN ('approval', 'revision_required', 'rejection', 'review_request')`, or on all notification types? A `type` filter in the function is the simplest approach.
5. **Resend domain:** A verified sending domain is required for production email (the free sandbox `onboarding@resend.dev` only works for testing). Does the project have a domain to verify?

---

## Sources

| Claim | Source |
|---|---|
| Supabase DB Webhooks mechanics, payload shape, `pg_net` async delivery | [supabase.com/docs/guides/database/webhooks](https://supabase.com/docs/guides/database/webhooks) |
| Resend Supabase Edge Function integration guide | [resend.com/docs/send-with-supabase-edge-functions](https://resend.com/docs/send-with-supabase-edge-functions) |
| Resend Node.js SDK, Deno `npm:resend` import | [resend.com/docs/send-with-nodejs](https://resend.com/docs/send-with-nodejs) |
| Resend free tier: 3,000/month, 100/day | [resend.com/pricing](https://resend.com/pricing) |
| Resend idempotency key: 24-hour window, all plans | Resend API docs (confirmed in research) |
| Expo Push HTTP endpoint + payload shape | [docs.expo.dev/push-notifications/sending-notifications](https://docs.expo.dev/push-notifications/sending-notifications) |
| `getExpoPushTokenAsync` + `projectId` requirement | [docs.expo.dev/versions/latest/sdk/notifications](https://docs.expo.dev/versions/latest/sdk/notifications) |
| Expo push: free, no volume cap, 600/s throughput limit | [expo.dev/eas](https://expo.dev/eas) |
| `expo-server-sdk` via `npm:` in Deno | Community-confirmed; official SDK README |
| Deno-native Expo SDK port | [deno.land/x/expo_server_sdk_deno](https://deno.land/x/expo_server_sdk_deno) |
| Supabase Edge Function JWT auth, `withSupabase({ auth: 'user' })` | Supabase Edge Functions auth docs |
| `pg_net` at-least-once delivery, `notified_at` idempotency pattern | Supabase community + pg_net docs |
| Existing RPCs + notification inserts | `docs/sql/faculty_access_rpcs.sql` (this repo) |
| Existing Edge Function pattern | `supabase/functions/request-otp/index.ts` (this repo) |
| Mobile anon-key-only constraint | `CLAUDE.md` Rule 4, `docs/PROJECT_CONTEXT.md` |

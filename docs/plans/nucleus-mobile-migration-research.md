# nucleus-mobile full-identity migration — research document

> Status: RESEARCH ONLY. Do not execute unless explicitly approved.
> Goal: literally everything references `nucleus-mobile`: GitHub repo/remote, npm name, Expo slug/project, EAS, Android `applicationId`/`namespace`, iOS `bundleIdentifier`, Firebase apps, deep-link scheme, docs/tooling.
> Date researched: 2026-09-30. SDK: Expo ~56.0.12, React Native 0.85.3, `runtimeVersion.policy: appVersion`.

## 0. TL;DR + the one irreversible fact

Changing `android.package` / `ios.bundleIdentifier` creates a **new app**, not a renamed app:

- New Play Store + App Store listings required. No in-place upgrade. `versionCode 1` / `1.0.0` restarts.
- Devices install side-by-side with the old app. OS sandbox (`AsyncStorage`, Keychain, `documents/`) does not migrate.
- Old binaries keep polling the old EAS `projectId` for OTA; old FCM/APNs tokens stay bound to the old Firebase/Expo project.
- Safe renames (no reinstall): GitHub repo name, npm `name` (`private:true`), Expo display `name`, `slug` alone, docs/brand text.
- Breaking renames (reinstall + new builds + new credentials): `applicationId`, `bundleIdentifier`, new Expo `projectId`, new Firebase project, new Supabase project.

Decide the migration tier first (§1) — everything else follows.

## 1. Decision matrix (make these calls before touching anything)

| # | Decision | Option A (continuity) | Option B (clean break = true `nucleus-mobile` identity) | Recommendation for full migration |
|---|---|---|---|---|
| D1 | GitHub repo | Keep `capstone-nucleus-rn` | `gh repo rename nucleus-mobile` | B. Low risk. Redirects cover stragglers. |
| D2 | npm `name` | Keep `capstone-nucleus-rn` | `nucleus-mobile` | B. Zero runtime effect (`private:true`). |
| D3 | Expo `slug` | Keep `nucleus-student-mobile` | `nucleus-mobile` | B. Safe alone; kills `exp+nucleus-student-mobile` links. |
| D4 | Expo project | Keep `cfc58fb4-9bdc-4fd8-91ed-44a201032d8d` | `eas init` new project | B for literal full migration; accept severed OTA (§4). |
| D5 | Android `applicationId` + `namespace` | Keep `com.christianmeude.nucleus` (+`.dev`/`.preview`) | New, e.g. `com.christianmeude.nucleusmobile` (+`.dev`/`.preview`) | B for literal migration; = new Play listing (§8). |
| D6 | iOS `bundleIdentifier` | Keep `com.christianmeude.nucleus*` | New, mirroring D5 | B; = new App Store record (§8). Must match D5 convention. |
| D7 | Firebase | Add new Android/iOS apps to **same** project `nucleus-push-5cb6d` | New Firebase project | A unless isolation is required. Same project keeps sender ID; new project invalidates all tokens/keys (§6). |
| D8 | Supabase project | Keep `EXPO_PUBLIC_SUPABASE_URL` / anon key | New Supabase project + data migration | A. No evidence the rename requires a new backend. New project = migrate `auth.users`, `public.users`, `research-papers` bucket, `push_tokens`, RLS, all edge functions (§7). |
| D9 | AsyncStorage keys (`@nucleus/*`, `nucleus.theme.preference`, `firstRun.*`, `browse.*`, `submission_draft_*`) | Keep keys (fresh sandbox wipes them anyway) | Rename keys + ship dual-read migration | A. New sandbox already wipes data; renaming keys adds a second wipe with no benefit. |
| D10 | Store strategy | N/A (upgrade) | New listings + deprecate old with migration notice | B is mandatory if D5/D6 = B. Unpublish old after window; beware Apple spam rejection if both live with same name. |

Suggested new identifiers (must be frozen before step 1 of runbook):

- Repo: `christianmeude/nucleus-mobile`
- npm: `nucleus-mobile`
- Expo slug: `nucleus-mobile`
- Android: `com.christianmeude.nucleusmobile`, dev `...nucleusmobile.dev`, preview `...nucleusmobile.preview`
- iOS: same triple as Android
- Deep-link scheme after prebuild: `exp+nucleus-mobile` (auto from slug via `expo-dev-client`; consider adding explicit `scheme: nucleus-mobile` — see §5)

## 2. Complete identity inventory (all layers)

### 2.1 GitHub / npm / local filesystem

| File | Line(s) | Value | Action on migration |
|---|---|---|---|
| `package.json` | 2–3 | `"name": "capstone-nucleus-rn"`, `"version": "1.0.0"` | Rename to `nucleus-mobile`. `version` is `appVersionSource: local` input — bump when forking runtime. |
| `package.json` | 6–10 | `APP_VARIANT=development` start scripts | Keep. Variant mechanism unchanged. |
| `package-lock.json` | 2–3, 8–9 | lockfile `name` mirror | Regenerate via `npm install` after rename; do not hand-edit. |
| git remote | — | `origin https://github.com/christianmeude/capstone-nucleus-rn.git` | `gh repo rename nucleus-mobile` + `git remote set-url origin https://github.com/christianmeude/nucleus-mobile.git`. |
| local folder | — | `C:\...\capstone-nucleus-rn` | Rename dir, reopen workspace, `rm -rf .expo dist node_modules && npm ci`. |
| `.design-sync/config.json` | 3 | `"pkg": "capstone-nucleus-rn"` | Update to `nucleus-mobile`. Note `projectId: 861320dc-...` here is the design-sync tool project, distinct from EAS `cfc58fb4-...`. |
| `docs/plans/ui-polish-2026-09-08.md` | 7, 129, 260 | old repo refs | Update prose; 129/260 refer to sibling `capstone-nucleus` web repo — leave unless that repo also renames. |
| `docs/appendix-f-mobile-inventory.md` | 4 | old repo ref | Update prose. |
| `AGENTS.md`, `docs/agents/issue-tracker.md` | — | tracker pointers, `repos/<owner>/<repo>` templates | No hardcoded `owner/repo`; `gh` infers from remote. No change needed after remote update. |

### 2.2 Expo / EAS (`app.config.ts`, `eas.json`, workflows)

| File | Line(s) | Value | Action |
|---|---|---|---|
| `app.config.ts` | 9–13 | `name: NUcleus Mobile (Dev)` / `NUcleus Mobile` | Keep display name or rebrand; cosmetic only. |
| `app.config.ts` | 14 | `slug: nucleus-student-mobile` | → `nucleus-mobile`. |
| `app.config.ts` | 15 | `version: 1.0.0` | Bump (e.g. `1.0.0` → keep or `2.0.0`) when forking so `appVersion` runtime does not collide across old/new projects. |
| `app.config.ts` | 25–32 | iOS `bundleIdentifier` triple | → new triple per D6. No `ios/` dir exists (managed workflow; `/ios` gitignored per `.gitignore:41`, `.easignore:41`). |
| `app.config.ts` | 34 | `googleServicesFile: ./google-services.json` | Keep pointer; replace file contents (§6). |
| `app.config.ts` | 39–43 | Android `package` triple | → new triple per D5. |
| `app.config.ts` | 50–56 | plugins (notably **no** `expo-notifications` plugin entry) | No change for rename. |
| `app.config.ts` | 59, 63 | `extra.eas.projectId: cfc58fb4-...`, `updates.url: https://u.expo.dev/cfc58fb4-...` | New project → replace both with new ID/URL. Keep project → leave untouched. Absent: no `scheme` field — deep-link scheme currently only from slug (see §5). |
| `app.config.ts` | 65–67 | `runtimeVersion: { policy: appVersion }` | Keep. Understand: runtime = `version` string only; bump `version` on fork. |
| `app.config.ts` | 68 | `owner: christianmeude` | Must match account owning the (new) project or `eas build/update` fails. |
| `eas.json` | 2–4, 7–24 | `appVersionSource: local`, channels `development`/`preview`/`production`, `APP_VARIANT` env | Keep channel names; recreate same channels in new Expo project. `production` has no `APP_VARIANT` override (falls to prod IDs) — preserve that. |
| `.github/workflows/eas-update.yml` | 5–6, 13–18, 40–41 | push on `main`, `secrets.EXPO_TOKEN`, `eas update --branch preview` | Re-add `EXPO_TOKEN` scoped to new Expo project in the renamed repo (secrets travel on rename, not on new-repo creation). Branch `preview` must exist in new project. |
| `.github/workflows/ci.yml` | all | typecheck/lint/test on `main` | Identity-free. No change. |
| `src/hooks/usePushNotifications.ts` | 32–34 | `getExpoPushTokenAsync({ projectId: process.env.EXPO_PUBLIC_PROJECT_ID })` | **Pre-existing gap**: `EXPO_PUBLIC_PROJECT_ID` is in neither `.env` nor `.env.example`. Must set to new project ID via EAS secrets/env or token resolution targets the wrong project. |
| `supabase/functions/notify-review-action/index.ts` | 64 | `https://exp.host/--/api/v2/push/send` | Project-agnostic endpoint; server-side Expo/FCM/APNs credentials behind it are per-project and must be re-linked (§6). |

### 2.3 Android native (prebuilt; gitignored but present on disk)

| File | Line(s) | Value | Action |
|---|---|---|---|
| `android/settings.gradle` | 34 | `rootProject.name = 'NUcleus Mobile'` | Cosmetic; update or leave. |
| `android/app/build.gradle` | 90, 92 | `namespace` / `applicationId 'com.christianmeude.nucleus'` (static; `.dev`/`.preview` only via `app.config.ts`) | Regenerate via `npx expo prebuild --clean` after config change; do not hand-maintain. |
| `android/app/build.gradle` | 95–96 | `versionCode 1`, `versionName "1.0.0"` | New listing → may restart at 1. Keep `versionName` in sync with `app.config.ts` version. |
| `android/app/build.gradle` | 100–122, 184 | debug keystore only; `release` reuses debug; `com.google.gms.google-services` plugin | Create real release signing (EAS-managed credentials) for new ID. Never ship debug key. Only key on disk: `android/app/debug.keystore`. |
| `android/.../java/com/christianmeude/nucleus/MainActivity.kt` | 1 | `package com.christianmeude.nucleus` | Regenerate via prebuild (moves package dir). |
| `android/.../java/com/christianmeude/nucleus/MainApplication.kt` | 1 | same | Same. |
| `android/app/src/main/res/values/strings.xml` | 2 | `NUcleus Mobile` | Cosmetic; regenerate or update. |
| `android/app/src/main/AndroidManifest.xml` | 15, 28 | `updates.ENABLED=false` (prebuild artifact; EAS uses `app.config.ts`), `scheme="exp+nucleus-student-mobile"` | Scheme regenerates from new slug on `prebuild --clean`. |
| `android/app/google-services.json` + root `google-services.json` | all | `project_id: nucleus-push-5cb6d`, 3× `package_name` (`com.christianmeude.nucleus[.dev\|.preview]`) | Replace **both copies** with re-issued file containing new package names (§6). |
| `android/gradle.properties`, `android/build.gradle` | — | `newArchEnabled/hermes/edgeToEdge`, `google-services:4.4.4` | No change. |

### 2.4 iOS

No `ios/` directory (managed workflow). Only identity: `app.config.ts:25–32` (`bundleIdentifier` triple, `supportsTablet`). No `Info.plist`, entitlements, `GoogleService-Info.plist`, or `*.p8` in repo (correctly gitignored per `.gitignore:13–19`). On migration: register new App IDs + provisioning profiles + APNs key, enable Push/Associated-Domains capabilities anew, `eas credentials` regenerate, `eas build` iOS.

### 2.5 Firebase / push

- Root `google-services.json:3–5`: `project_number 85762037447`, `project_id nucleus-push-5cb6d`, `storage_bucket ...firebasestorage.app`. Three clients (`:10–12`, `:29–31`, `:48–50`) for base/`.dev`/`.preview` with distinct `mobilesdk_app_id`s, shared `current_key AIzaSyAN6...`.
- `package_name` is immutable per Firebase app registration — must **Add app** for each new package name (same project per D7-A) and re-download the merged `google-services.json` to both root and `android/app/`.
- Android channel `default` (`usePushNotifications.ts:38–45`), token registration via `supabase.rpc('register_push_token')` (`:48–50`), schema `docs/sql/0001_push_notifications_schema.sql` (`push_tokens`, unique `(user_id, expo_push_token)`).
- iOS push: no plist/key in repo; configure APNs in Apple + Expo dashboard for new bundle IDs.
- Expo Push service (`exp.host/--/api/v2/push/send`) needs new FCM service-account + APNs key uploaded to the **new** Expo project; old `push_tokens` rows are undeliverable after cutover and must be pruned after clients re-register.

### 2.6 Supabase (code survives; sessions/data need a plan)

- Sole client source: `src/config/env.ts:2–8` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`) → `src/lib/supabase.ts:15–22` (`persistSession:true, autoRefreshToken:true, detectSessionInUrl:false`, AsyncStorage store).
- No `redirectTo`/`emailRedirectTo`/`makeRedirectUri` in `src/` (grep negative); password login (`AuthContext.tsx:96–99` `signInWithPassword`) is unaffected by rename. If magic-link/OAuth is added later, Supabase Dashboard redirect allow-list must include the new scheme/bundle ID/package.
- supabase-js v2 session key is `sb-<project-ref>-auth-token`. New Supabase project (D8-B) = silent logout for all; changing `applicationId` alone (same Supabase project) **also** logs everyone out because the OS sandbox is per-`applicationId` (§2.7).
- Storage: `src/api/research.ts:1264–1286` (`research-papers` upload + `getPublicUrl`), `:782` + `faculty.ts:895` (`createSignedUrl(...,3600)`). Test fixtures use `https://project.supabase.co/...` (tests only).
- Edge functions (`supabase/functions/*/index.ts`): `request-otp`, `verify-otp`, `search-papers`, `embed-papers`, `request-publish`, `update-recovery-email`, `notify-review-action`. Env-driven (`SUPABASE_URL`, `SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `ENABLE_EMAIL_DISPATCH` per `notify-review-action/index.ts:4–7`). No slug hardcoding. Redeploy/re-link only if Supabase project changes.

### 2.7 AsyncStorage / local persistence (keys are slug-free; store is per-`applicationId`)

| File | Key | Notes |
|---|---|---|
| `src/storage/authStorage.ts:3–4` | `@nucleus/access-token`, `@nucleus/refresh-token` | Only used by `clearAuthTokens` (`:6–7`, called `AuthContext.tsx:149–151`); Supabase owns the real session key. |
| `src/context/PrivacyContext.tsx:4`, `src/components/dev/DevResetModal.tsx:9` | `@nucleus_privacy_accepted` | Privacy gate re-shows after reinstall. |
| `src/context/ThemeContext.tsx:9` | `nucleus.theme.preference` | Theme resets. |
| `src/hooks/useHasOnboarded.ts:4` | `firstRun.hasOnboarded` (gates `AppNavigator.tsx:153–154`) | Onboarding re-shows. |
| `src/hooks/useSeenCoachmarks.ts:5`, `useRecentSearches.ts:4`, `useHasSearchedOnce.ts:4` | `firstRun.seenCoachmarks`, `browse.recentSearches`, `browse.hasSearchedOnce` | Reset. |
| `src/screens/main/SubmitResearchScreen.tsx:55,71–72` | `submission_draft_<id\|new>` | Unsubmitted drafts lost. |
| `src/lib/supabase.ts:17` | supabase-js session in AsyncStorage | Silent logout on new sandbox/project-ref. |

No code change needed; user impact (logout + reset gates/drafts) is unavoidable on new `applicationId`. Do not rename keys (adds a second wipe).

### 2.8 Navigation / picker / fonts / assets (rename-safe, verify only)

- Navigation: `src/navigation/AppNavigator.tsx` — pure bottom-tab + native-stack, **no `linking` prop**. In-app routes identity-free.
- External links: `PrivacyNoticeGate.tsx:12,87` (`https:`/`mailto:`), `ResearchDetailScreen.tsx:401` + `FacultyReviewDetailScreen.tsx:351` (`https://doi.org/...`), `PdfViewer.tsx:436` (`WebBrowser.openBrowserAsync`). Unaffected.
- Document picker: `SubmitResearchScreen.tsx:551–555` (`copyToCacheDirectory:true`, MIME map `:79–90`). Only OS permission re-grant (`AndroidManifest.xml:3,6`) on new package.
- Fonts/splash/icons: `App.tsx:5–11,68–73` (`@expo-google-fonts/inter` 400/500/600/700), `app.config.ts:17–24,35–38,47–49` (icon/splash/adaptive/favicon), `scripts/generate-icons.mjs` (regenerates all four from `assets/images/nucleus-mark.png`). Rename does not break loading; brand filenames + `strings.xml` + `rootProject.name` are cosmetic follow-ups.

### 2.9 Docs / brand / tooling caches

- Brand prose: `README.md:1`, `CONTEXT.md:1`, `PRODUCT.md:11,18,31`, `DESIGN.md:2–3`, `.design-sync/conventions.md:1`, `docs/design/SCREENS.md:1`, ADRs (`docs/adr/0001`, `0003`). Update `capstone-nucleus-rn` literals; sibling `capstone-nucleus` web-repo refs are out of scope.
- Caches (do not migrate; delete + regenerate): `.expo/` (`settings.json` lan, `devices.json` install IDs), `dist/` (web export), `node_modules/`, `.design-sync/ds-bundle` (gitignored).
- `.easignore:34–35` excludes `.env` from EAS uploads → `EXPO_PUBLIC_*` (including missing `EXPO_PUBLIC_PROJECT_ID`) **must** come from EAS Secrets / `eas.json env` for the new project or they silently fall back to `''` (`env.ts:2–8`).

## 3. Runbook (ordered; execute top-to-bottom)

### Phase 0 — Freeze + audit (1–2 h)

1. Record baseline: `slug`, `projectId` (`app.config.ts:59`), `updates.url` (`:63`), `version` (`:15`), `package`/`bundleIdentifier` triples (`:27–43`), Firebase `project_id` + 3 `package_name`s + `mobilesdk_app_id`s, `versionCode/versionName` (`build.gradle:95–96`), `EXPO_PUBLIC_PROJECT_ID` state (currently unset), channels (`eas channel:list`), EAS credentials state, store listing IDs, Supabase project ref.
2. `git status` clean; create backup branch `pre-migration-capstone-nucleus-rn`.
3. Confirm D1–D10 decisions (§1) and freeze new identifier strings.

### Phase 1 — GitHub + local (low risk, do first)

4. `gh repo rename nucleus-mobile` (web: Settings → Repository name). Never reuse the old name (kills redirects).
5. `git remote set-url origin https://github.com/christianmeude/nucleus-mobile.git`; `git remote -v`; `gh repo view` to verify.
6. Rename local dir, reopen workspace, `rm -rf .expo dist node_modules`, `npm ci`.
7. `npm pkg set name=nucleus-mobile` + `npm install` (regenerates lockfile); update `.design-sync/config.json` `pkg`; update docs literals (§2.1, §2.9).
8. Verify: `gh issue list`, Actions tab (secrets/rulesets transfer on rename), fix any hardcoded clone URLs/badges/`githubUrl`/webhook filters.

### Phase 2 — Expo project + Firebase (before any config edit)

9. New Expo project: `eas init` (or dashboard) → record new `projectId`. Recreate channels `development`/`preview`/`production` to match `eas.json`. Keep old project archived until cutover done.
10. Firebase: same project (D7-A) → Add app for each of the 3 new package names (+ iOS bundle IDs when iOS build exists) → add SHA-1/SHA-256 → download merged `google-services.json` → place at root **and** `android/app/` (both copies must match). New project (D7-B) only if isolation required: also migrate FCM server credentials.
11. Expo dashboard → new project → upload FCM service-account + APNs key; note new push credential set.
12. EAS + Supabase dashboards: add `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, **`EXPO_PUBLIC_PROJECT_ID=<new-id>`** as secrets/env for the new project. Fix the pre-existing unset-`PROJECT_ID` gap now.

### Phase 3 — App config + native regen

13. Edit `app.config.ts`: `slug → nucleus-mobile`, `version` bump, `package`/`bundleIdentifier` triples → new IDs, `extra.eas.projectId` + `updates.url` → new ID/URL, confirm `owner`. Optionally add explicit `scheme: nucleus-mobile` (recommended so deep links don't depend solely on the auto `exp+<slug>` dev-client scheme).
14. `npx expo prebuild --clean`; verify: `npx expo config --json` (slug, scheme, package, bundleId, projectId, updates.url), `AndroidManifest.xml` scheme `exp+nucleus-mobile`, `MainActivity.kt`/`MainApplication.kt` package, `strings.xml`, `build.gradle` namespace/applicationId/versionCode.
15. `node scripts/generate-icons.mjs` only if rebranding artwork; otherwise leave assets.
16. `npm run typecheck && npm run lint && npm test`; `npx expo start` smoke test (dev-client will install as a **second** app — expected).

### Phase 4 — Credentials + builds + OTA

17. `eas credentials` — regenerate Android signing linkage + iOS profiles for new IDs. Create real release keystore (current `release` reuses debug — must not ship).
18. `eas build --profile development` → install dev-client; `eas build --profile preview` → internal QA; `eas build --profile production` → both platforms. Confirm side-by-side install with old app.
19. `eas update --branch preview` (or per-channel) **only** to the new project; confirm old binaries still poll the old project (orphaned by design).
20. If Supabase project kept: no backend change. If new: migrate auth/users/buckets/`push_tokens`/RLS/policies (`docs/sql/*.sql`), redeploy all `supabase/functions/*`, rotate `SUPABASE_URL`/`SERVICE_ROLE_KEY`/`RESEND_API_KEY`.

### Phase 5 — Stores + cutover + deprecation

21. Create **new** Play + App Store listings (new `applicationId`/`bundleIdentifier`; `versionCode`/`buildNumber` may start at 1). Upload new builds. Request review.
22. Publish migration notice on the old listings (and in-app notice before final old-project OTA, if desired). Keep dual `push_tokens` acceptance during the window; prune stale tokens after clients re-register (`register_push_token`).
23. After adoption threshold: unpublish old listings, archive old EAS project + old Firebase apps (same-project case) to prevent accidental publishes. Keep old GitHub redirect (do not reuse old repo name).

## 4. Functionality verification checklist (must all pass before deprecating old app)

- [ ] OTA: new binary receives `eas update` on its channel; old binary does **not** (orphaned). `runtimeVersion` matches `version`.
- [ ] Dev loop: `expo start --android/ios` attaches to new dev-client; `APP_VARIANT` dev/preview/prod resolve to correct IDs.
- [ ] Push Android: fresh `getExpoPushTokenAsync` with new `EXPO_PUBLIC_PROJECT_ID` → `register_push_token` row → `notify-review-action` delivers via new FCM credential.
- [ ] Push iOS: same via new APNs key/bundle ID (requires iOS build; none exists in repo today).
- [ ] Deep links: `exp+nucleus-mobile` (and explicit `scheme` if added) resolves; old `exp+nucleus-student-mobile` correctly dead on new installs.
- [ ] Auth: login persists across restart on new app; old session not expected to carry over (new sandbox).
- [ ] Storage/RLS: upload to `research-papers`, `getPublicUrl`, `createSignedUrl` round-trip; edge functions (`search-papers`, `embed-papers`, `request-otp`, `verify-otp`, `request-publish`, `update-recovery-email`, `notify-review-action`) succeed with new env.
- [ ] Local state: privacy gate/onboarding/coachmarks/theme/drafts behave as fresh install (expected reset); no crash on missing keys.
- [ ] Picker/fonts/assets: document pick + MIME accept, Inter fonts, icons/splash/adaptive/favicon load.
- [ ] Signing: release builds signed with real (EAS) credentials, not `debug.keystore`.
- [ ] CI: `ci.yml` green; `eas-update.yml` publishes to new project (valid `EXPO_TOKEN`).
- [ ] Dashboards: old project archived; new project owns channels/branches/credentials; Supabase redirect allow-list updated if auth links ever added.

## 5. Risks + mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Old users never migrate (no upgrade path) | Split user base, stale data | In-old-app banner + store deprecation notice + comms window; keep old backend readable during transition. |
| OTA published to wrong project | New clients stale / old clients confused | Publish only to new `projectId`; archive old project; bump `version` on fork to separate runtimes. |
| Push blackout (wrong `PROJECT_ID`/FCM/APNs) | No notifications | Set `EXPO_PUBLIC_PROJECT_ID`, upload new FCM/APNs creds, rebuild, verify token registration end-to-end before store submission. |
| `google-services.json` copies diverge | FCM rejects at runtime | Single source → copy to both root and `android/app/`; verify `package_name` triple matches config. |
| `.env` excluded from EAS (`.easignore:34–35`) | Blank Supabase URL/key in builds | EAS secrets/env for every `EXPO_PUBLIC_*`; fail build if empty. |
| Release signed with debug key | Store rejection / insecurity | EAS-managed release credentials for new ID; verify before `production` build. |
| Apple duplicate-name rejection | New listing blocked | Unpublish/rename old listing first in rebrand case. |
| Reusing old repo name elsewhere | GitHub redirects die | Never recreate `capstone-nucleus-rn`. |

## 6. Open questions (block execution until answered)

1. Exact new Java/Kotlin package + bundle ID triple (proposal in §1 — approve or amend)?
2. New vs reused Expo `projectId` (full migration assumes new — confirm severed OTA is accepted)?
3. Same vs new Firebase project (recommendation: same — confirm)?
4. Keep vs new Supabase project (recommendation: keep — confirm)?
5. Add explicit `scheme: nucleus-mobile` alongside the auto `exp+<slug>` scheme?
6. Store cutover window + who unpublishes old listings and archives old EAS/Firebase apps?
7. Rollback trigger: at what adoption/error threshold do we pause and keep the old app canonical?

## 7. Sources consulted

- Repo reads: `package.json`, `package-lock.json`, `app.config.ts`, `eas.json`, `index.ts`, `App.tsx`, `android/app/build.gradle`, `android/settings.gradle`, `android/.../AndroidManifest.xml`, `MainActivity.kt`, `MainApplication.kt`, `strings.xml`, root + `android/app/google-services.json`, `.env`, `.env.example`, `.easignore`, `.gitignore`, `.github/workflows/ci.yml`, `eas-update.yml`, `src/config/env.ts`, `src/lib/supabase.ts`, `src/hooks/usePushNotifications.ts`, `src/storage/authStorage.ts`, `src/context/*`, `src/navigation/AppNavigator.tsx`, `scripts/generate-icons.mjs`, `supabase/functions/*/index.ts`, `docs/sql/0001_push_notifications_schema.sql`, `README.md`, `CONTEXT.md`, `PRODUCT.md`, `DESIGN.md`, `docs/adr/*`, `.design-sync/config.json`, `skills-lock.json`.
- Negative searches confirmed absent: `nucleus-mobile` literal, `ios/` tree, `GoogleService-Info.plist`, `*.p8`, `scheme` in `app.config.ts`, `makeRedirectUri`/`createURL` in `src/`, `auth-callback` wiring (`detectSessionInUrl:false`).
- Expo/EAS/Firebase/GitHub semantics verified against current platform behavior (SDK 56 era): slug vs `exp+<slug>` dev-client scheme, `updates.url` per-`projectId` OTA orphaning, `appVersion` runtime semantics, channel/branch per-project isolation, `applicationId`/`bundleIdentifier` immutability + new-listing requirement, Firebase `package_name` immutability + same-project Add-app path, GitHub rename redirect/secret preservation.

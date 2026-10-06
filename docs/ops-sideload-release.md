# Sideload Release Runbook (Android only, no Play Store)

Official flow: EAS internal-distribution APK + EAS Update.
Users only ever see the GH Pages download page. Never send them expo.dev links.

## Where things live (you own all of it)

- **Build kitchen (Expo, dev-only):** `eas build` compiles the APK. The expo.dev
  artifact link is for maintainers only.
- **APK shelf (GitHub Releases, repo you own):** each production APK is attached
  to a Release as a versioned asset (e.g. `nucleus-1.0.0-b1.apk`) plus a stable
  alias named exactly `nucleus-latest.apk`. Button URL never changes:
  `https://github.com/christianmeude/nucleus-mobile/releases/latest/download/nucleus-latest.apk`
- **Landing page (GH Pages, same repo):** source is `download/index.html` +
  `download/latest.json`, auto-deployed by
  `.github/workflows/deploy-download-page.yml` on every `main` push touching
  `download/**`. Public URL after first deploy:
  `https://christianmeude.github.io/nucleus-mobile/download/`
  Print/QR this page URL, never the APK or expo.dev URL directly.
- **Small fixes (EAS Update on Expo):** invisible to users, still served by Expo
  on app restart. No reinstall.

Do NOT use a colleague's Supabase project for APK hosting. If that project is
deleted, capped, or made private, your download breaks and you cannot fix it.

## Profiles

| Profile       | Package                             | Channel       | Artifact | Used for                    |
| ------------- | ----------------------------------- | ------------- | -------- | --------------------------- |
| `development` | `com.christianmeude.nucleusmobile.dev`     | `development` | APK (dev client) | Local dev, needs `expo start` |
| `preview`     | `com.christianmeude.nucleusmobile.preview` | `preview`     | APK      | QA, installs side-by-side with dev |
| `production`  | `com.christianmeude.nucleusmobile`         | `production`  | APK      | Real users (sideload)       |

`production` is `distribution: internal` + `android.buildType: apk` in `eas.json`.
Do NOT switch it back to store/AAB or sideload breaks.
`versionCode` (currently `1` in `app.config.ts`) must be bumped manually per
native release — EAS `autoIncrement` does not support dynamic `app.config.ts`.

## Credentials — do not touch after launch

- Android keystore is EAS-managed. Owner: Expo account `christianmeude`.
- Never run `eas credentials:reset` / delete the keystore after v1 ships.
  Symptom if you do: `INSTALL_FAILED_UPDATE_INCOMPATIBLE`, users must uninstall + lose data.
- Package name `com.christianmeude.nucleusmobile` is frozen after v1.

## First launch

```powershell
eas login
eas build -p android --profile production
```

1. Wait for build to finish on expo.dev (dashboard only, not user-facing).
2. Download the `.apk` from the Build artifact section to your laptop.
3. Publish it on a GitHub Release (keeps versioned + stable alias side by side):
   ```powershell
   $v = "v1.0.0-b1"
   Copy-Item ~\Downloads\*.apk "nucleus-1.0.0-b1.apk"
   Copy-Item "nucleus-1.0.0-b1.apk" "nucleus-latest.apk"
   gh release create $v nucleus-1.0.0-b1.apk nucleus-latest.apk `
     --title "NUcleus Mobile 1.0.0 (b1)" `
     --notes "Initial sideload release. Install from the download page."
   ```
   Later releases: attach the new versioned APK, then replace the alias:
   ```powershell
   gh release upload v1.1.0-b2 nucleus-1.1.0-b2.apk
   gh release delete-asset v1.1.0-b2 nucleus-latest.apk --yes
   gh release upload v1.1.0-b2 nucleus-latest.apk
   ```
   Simpler alternative: GitHub web → Releases → Draft new release → drag both files.
4. Update `download/latest.json` (version, build, date, notes). `apkUrl` stays the
   `.../releases/latest/download/nucleus-latest.apk` alias — do not point it at
   expo.dev.
5. Push to `main`. The Pages workflow redeploys the landing page automatically.
   Enable Pages once: repo Settings → Pages → Source: GitHub Actions.
6. Generate/print QR encoding the Pages URL
   (`https://christianmeude.github.io/capstone-nucleus-rn/download/`).
7. Smoke test on a real phone with no Expo login: open page → Download →
   allow `Install unknown apps` → `Install anyway` → Open.

## Daily fixes (no reinstall)

Only for JS/TS, styles, screens, assets in `src/`:

```powershell
# test on QA app first
eas update --channel preview --message "what changed"

# ship to users (auto-applies on next cold start)
eas update --channel production --message "what changed"
```

`runtimeVersion.policy` is `appVersion`, so an update only lands on builds
with the same `version` (1.0.0). If you bumped `version`, old APKs won't get it —
that's a signal you need a new APK, not an update.

## Native changes (requires new APK + re-download)

Any of: `app.config.ts` plugins/permissions/icon/splash, Expo SDK bump,
`react-native` bump, `runtimeVersion` change.

```powershell
# 1. bump version in app.config.ts (e.g. 1.0.0 -> 1.1.0) AND versionCode +1
#    (manual — autoIncrement is unsupported with app.config.ts).
# 2. quick QA
eas build -p android --profile preview
# 3. launch build
eas build -p android --profile production
# 4. attach new APK to a new GitHub Release + refresh nucleus-latest.apk alias,
#    update download/latest.json (set requiresReinstall: true),
#    announce "please re-download from the download page"
```

Users install the new `.apk` over the old one. No uninstall needed as long as
package + keystore are unchanged.

## Rollback a bad OTA

```powershell
# send users back to previous update
eas update:rollback --branch production

# or stop serving updates while you investigate (preview unaffected)
eas channel:pause production
eas channel:resume production
```

## Landing page maintenance

- Source of truth: `download/index.html` + `download/latest.json`.
- The page auto-fetches `./latest.json`, so most releases only edit that file.
- QR code must encode the Pages URL, never the expo.dev build URL or the raw APK URL.

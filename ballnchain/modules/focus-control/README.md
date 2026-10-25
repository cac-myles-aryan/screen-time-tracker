# focus-control

iOS-only native module: blocks apps/sites with Screen Time (FamilyControls,
ManagedSettings, DeviceActivity) and picks an accountability contact.

```ts
import * as Focus from "../../modules/focus-control/src";

await Focus.requestAuthorization();           // system Screen Time prompt
await Focus.pickAppsToBlock();                // FamilyActivityPicker
await Focus.startBlocking(endsAt);            // endsAt: Date, >= 15 min away
await Focus.stopBlocking();
const contact = await Focus.pickContact();    // { name, phoneNumber } | null
Focus.onAuthorizationChange((s) => { /* "denied" mid-session = tamper */ });
```

## Layout

| Path | Runs in | Purpose |
| --- | --- | --- |
| `ios/FocusController.swift` | app | auth, selection, shield on/off, DeviceActivity schedule |
| `ios/AppPicker.swift`, `ios/ContactPicker.swift` | app | system pickers |
| `ios/FocusControlModule.swift` | app | Expo bridge (autolinked from `modules/`) |
| `extensions/FocusMonitor/` | extension | lifts the shield at session end, app closed or not |
| `extensions/FocusShield/` | extension | the "Stay focused" screen on a blocked app |

## One-time setup (cannot be automated from code)

1. **Entitlement.** `com.apple.developer.family-controls` is already in
   `app.json`. Development builds work with a paid developer account; shipping
   to TestFlight/App Store needs Apple's approval of the Family Controls
   (Distribution) request for the app and for each extension bundle id.
2. **Development build, not Expo Go:** `npx expo prebuild --platform ios`, then
   `npx expo run:ios --device` (Screen Time cannot be tested meaningfully on the
   simulator). The JS wrapper returns `isFocusControlAvailable = false` in Expo Go.
3. **Add the two extension targets in Xcode** (File > New > Target):
   *Device Activity Monitor Extension* with `extensions/FocusMonitor/*.swift`,
   and *Shield Configuration Extension* with `extensions/FocusShield/*.swift`.
   Give both targets the `family-controls` entitlement and the App Group
   `group.com.anonymous.ballnchain`. Without the monitor extension the shield
   is only lifted when the app is next opened (`reconcile()`).
   `ios/` is gitignored, so re-do this after a clean `prebuild`, or move it
   into a config plugin.

## Limits you need to know about

- **Sessions must be 15+ minutes.** iOS rejects shorter DeviceActivity
  intervals; `startBlocking` throws. The Home screen's custom duration allows
  1 minute and should be raised to 15 when blocking is wired in.
- **iOS never says which apps were chosen**, only opaque tokens. The app shows
  counts.
- **Individual authorization can be revoked by the user** in
  Settings > Screen Time at any time. Revoking removes the shield. The app can
  only *notice* while it is running (`onAuthorizationChange`, and the status
  check on foreground).
- **`denyAppRemoval`** hides the home-screen delete option during a session.
  The user can still delete via Settings > General > iPhone Storage, so it
  slows deletion rather than preventing it.
- **Detecting deletion or revocation while the app is dead cannot be done on the
  phone.** Do it server-side: the app (and optionally the monitor extension)
  pings a heartbeat to Supabase during a session; an Edge Function / cron marks
  a session tampered when pings stop before `expiry_at`, then texts the contact.
- **Texting the contact is server-side too.** `pickContact()` only returns the
  number. iOS apps cannot send an SMS silently; use an Edge Function with
  Twilio (or similar) and store the contact on the session row.

## Texting the contact (implemented)

`supabase/functions/notify-contact` texts the session's contact via Twilio when
the app reports a tamper (`reportTamper` in `src/lib/session_handler.js`). Home
calls it when Screen Time access goes to `denied` mid-session, live or on the
next foreground. It notifies once per session. Setup:

1. Re-run `supabase/schema.sql` (adds `tamper_notified_at`, `tamper_reason`).
2. `supabase secrets set TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... TWILIO_FROM=+1...`
3. `supabase functions deploy notify-contact`

Not covered: a user who deletes the app or kills it while offline is never
reported, because only server-side heartbeats could detect that.

## Heartbeat and shield protection

- **Shield hardening** (`applyShield`): besides blocking apps it sets
  `denyAppRemoval`, `lockAccounts`, `lockPasscode` and
  `requireAutomaticDateAndTime`, so a session can't be escaped by switching
  accounts, changing the passcode, or moving the clock forward.
- **Shield dropped:** `reconcile()` (every foreground) re-applies a missing
  shield and flags it; Home reads the flag via `Focus.consumeShieldDropped()`
  and reports `shield_dropped`.
- **Heartbeat:** while a session runs, Home calls the `session_heartbeat()` SQL
  function every 30 s and on foreground. Re-run `supabase/schema.sql` first.
- **Stale sweep (optional):** `supabase/functions/sweep-stale-sessions` texts the
  contact when the heartbeat goes quiet. Deploy it, set `STALE_MINUTES`, and
  schedule it (pg_cron or dashboard) with the service-role key as bearer token.
  Caveat: iOS suspends the app in the background, so a phone left alone sends no
  heartbeat. Pick `STALE_MINUTES` longer than anyone would leave the app closed,
  or contacts get texted about people who did nothing wrong.

# iOS build workflows

The iOS Canary and Production GitHub Actions workflows archive signed apps and
optionally upload them to TestFlight. A push to `canary` or `master` uploads the
corresponding build automatically. A manual run defaults to skipping TestFlight
upload. Canary manual runs also export and save an IPA; Production manual runs
archive the app and save dSYMs.

Canary runs also export an Ad Hoc-signed IPA (`release-testing`) without uploading it
and save it as the `app-canary-ipa` Actions artifact. This includes manual runs
with TestFlight upload disabled. Register each test device's UDID in the Apple
Developer account before exporting. The device must be included in the signing
profiles for the app and its embedded targets. The exported IPA can then be
installed on those devices without re-signing. Automatic signing updates the
profiles during export; export fails if suitable profiles cannot be created.
TestFlight uploads continue to use a separate App Store Connect export.
If IPA export or artifact upload fails, the job fails, but TestFlight upload
still runs when requested, provided archiving succeeded and the run was not
cancelled.
Production runs continue to preserve only dSYMs as artifacts.

Release archives also upload symbols to Sentry from the Xcode build.
The `Bundle React Native code and images` phase runs `sentry-xcode.sh`
from `@sentry/react-native`, which uploads the Hermes source map.
ProdTrainLCD and CanaryTrainLCD then run `Upload Debug Symbols to Sentry`.
Keep this phase after all embedding and resource-copy phases. Its dSYM input
depends on processing the app's Info.plist, which depends on the embedded App
Clip. Placing the upload before `Embed App Clips` creates an archive dependency
cycle.
Auth is `ios/sentry.properties`, decoded from `SENTRY_PROPERTIES_BASE64`.
`xcodebuild archive` sets `ACTION=install` and must upload. Profile uses
Release with `ACTION=build`, so those builds set
`SENTRY_DISABLE_AUTO_UPLOAD=true`. The upload also fails the build when
the main app dSYM is not ready before the wait times out.
The archive step fails when `TrainLCD.app.dSYM` (production) or
`CanaryTrainLCD.app.dSYM` (Canary) is missing. The Actions artifact is
still the whole `dSYMs` directory.

Both workflows preserve the iOS build number committed to
`ios/TrainLCD.xcodeproj/project.pbxproj`. The version bump workflow updates that
value together with `app.config.ts`; build workflows must not replace it with a
GitHub Actions run number.

## Prerequisites

- A GitHub-hosted `macos-26` runner with Node.js 24 and CocoaPods available.
- An App Store Connect API key whose role permits build upload and provisioning
  management for both app identifiers.
- Apple development and distribution certificates, each exported with its
  private key as a password-protected PKCS #12 file. Automatic signing uses the
  development identity while archiving; export uses the distribution identity.
- An SSH deploy key with read access to the private Fonts submodule.

Configure these GitHub Actions secrets:

| Secret | Purpose |
| --- | --- |
| `STAGING_API_URL` | Canary API endpoint |
| `PRODUCTION_API_URL` | Production API endpoint |
| `DEV_ROUTE_RESOLVER_API_URL` | Canary route resolver endpoint |
| `PRODUCTION_ROUTE_RESOLVER_API_URL` | Production route resolver endpoint |
| `DEV_WORKER_API_URL` | Canary worker endpoint |
| `PRODUCTION_WORKER_API_URL` | Production worker endpoint |
| `ENABLE_EXPERIMENTAL_TELEMETRY` | Telemetry feature toggle |
| `EXPERIMENTAL_TELEMETRY_ENDPOINT_URL` | Telemetry endpoint |
| `EXPERIMENTAL_TELEMETRY_TOKEN` | Telemetry authentication token |
| `FONTS_SSH_KEY` | Fonts submodule SSH private key |
| `SENTRY_DSN` | Sentry runtime DSN (required; the build fails when unset) |
| `SENTRY_PROPERTIES_BASE64` | Base64-encoded `sentry.properties` |
| `GOOGLE_SERVICE_INFO_PLIST_DEV_BASE64` | Canary plist (Base64) |
| `GOOGLE_SERVICE_INFO_PLIST_PROD_BASE64` | Production plist (Base64) |
| `APP_STORE_CONNECT_API_ISSUER_ID` | App Store Connect API issuer ID |
| `APP_STORE_CONNECT_API_KEY_ID` | App Store Connect API key ID |
| `APP_STORE_CONNECT_API_PRIVATE_KEY_BASE64` | Base64-encoded API private key |
| `IOS_DEVELOPMENT_CERTIFICATE_BASE64` | Base64 development PKCS #12 |
| `IOS_DEVELOPMENT_CERTIFICATE_PASSWORD` | Development PKCS #12 password |
| `IOS_DISTRIBUTION_CERTIFICATE_BASE64` | Base64 distribution PKCS #12 |
| `IOS_DISTRIBUTION_CERTIFICATE_PASSWORD` | Distribution PKCS #12 password |

The workflow exposes application endpoint and telemetry values as environment
variables. App Store Connect credentials, certificate data, and the Fonts SSH
key remain step-scoped secrets. Both certificate imports are validated before
the archive starts so a missing private key fails with a targeted error.

## Safe dry-run

1. Open **Actions** and select **Build iOS Canary** or
   **Build iOS Production**.
2. Select the branch or commit to validate.
3. Leave **Upload the archive to TestFlight** disabled.
4. Run the workflow and confirm that dependency installation, environment
   validation, signing, and archive creation succeed. In the archive log,
   confirm `output: sentry-cli` lines from the source map upload and the debug
   file upload. Confirm the dSYM artifact contains `TrainLCD.app.dSYM` or
   `CanaryTrainLCD.app.dSYM`.
   For Canary, also confirm that IPA export and the `app-canary-ipa` artifact
   upload succeed.
5. Confirm that **Upload to TestFlight** is skipped and that
   **Remove signing credentials** runs even if an earlier step fails.

Enable **Upload the archive to TestFlight** only when the selected ref is
intended for distribution. Push-triggered Canary and Production workflows always
upload to TestFlight.

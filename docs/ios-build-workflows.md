# iOS build workflows

The iOS Canary and Production GitHub Actions workflows archive signed apps and
optionally upload them to TestFlight. A push to `canary` or `master` uploads the
corresponding build automatically. A manual run defaults to an archive-only
dry-run.

Both workflows preserve the iOS build number committed to
`ios/TrainLCD.xcodeproj/project.pbxproj`. The version bump workflow updates that
value together with `app.config.ts`; build workflows must not replace it with a
GitHub Actions run number.

## Prerequisites

- A GitHub-hosted `macos-26` runner with Node.js 22 and CocoaPods available.
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
| `SENTRY_PROPERTIES_BASE64` | Base64-encoded `sentry.properties` |
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
   validation, signing, archive creation, and dSYM upload succeed.
5. Confirm that **Upload to TestFlight** is skipped and that
   **Remove signing credentials** runs even if an earlier step fails.

Enable **Upload the archive to TestFlight** only when the selected ref is
intended for distribution. Push-triggered Canary and Production workflows always
upload to TestFlight.

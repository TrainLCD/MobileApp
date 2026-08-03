# Android build workflows

The Android Canary and Production GitHub Actions workflows build signed Android
App Bundles and optionally upload them to the Google Play internal track. A push
to `canary` or `master` uploads the corresponding build automatically. A manual
run defaults to a build-only dry-run.

## Prerequisites

- A GitHub-hosted `ubuntu-22.04` runner with Node.js 22 and Java 17.
- A release keystore and its alias and passwords.
- A Google Play service account with permission to publish both application IDs
  to the internal track.
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
| `RELEASE_KEYSTORE` | Base64-encoded Android release keystore |
| `KEYSTORE_PASSWORD` | Release keystore password |
| `KEYSTORE_KEY_ALIAS` | Release signing key alias |
| `KEYSTORE_KEY_PASSWORD` | Release signing key password |
| `PLAY_SERVICE_ACCOUNT_JSON` | Google Play service account JSON |

The workflow exposes application endpoint and telemetry values as environment
variables. Signing credentials, the Google Play service account, and the Fonts
SSH key remain step-scoped secrets.

## Safe dry-run

1. Open **Actions** and select **Build Android Canary** or
   **Build Android Production**.
2. Select the branch or commit to validate.
3. Leave **Upload the AAB to Google Play (internal track)** disabled.
4. Run the workflow and confirm that dependency installation, environment
   validation, signing, bundle creation, and artifact upload succeed.
5. Confirm that **Upload to Google Play (internal track)** is skipped.

Enable **Upload the AAB to Google Play (internal track)** only when the selected
ref is intended for distribution. Push-triggered Canary and Production workflows
always upload to the internal track.

# Android build workflows

The Android Canary and Production GitHub Actions workflows build signed Android
App Bundles and optionally upload them to the Google Play internal track. A push
to `canary` or `master` uploads the corresponding build automatically. A manual
run defaults to a build-only dry-run.

Each workflow builds **two** App Bundles — the handheld app (`:app`) and the
Wear OS app (`:wearable`) — and uploads each one to its own form-factor track:
`:app` to `internal` and `:wearable` to `wear:internal`. See
[Wear OS delivery](#wear-os-delivery) for why the two uploads must stay
separate.

## Prerequisites

- A GitHub-hosted `ubuntu-22.04` runner with Node.js 24 and Java 17.
- A release keystore and its alias and passwords.
- A Google Play service account with permission to publish both application IDs
  to the internal track and to the Wear OS track.
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
5. Confirm that both the `app-*Release` and `wearable-*Release` artifacts are
   produced.
6. Confirm that both **Upload to Google Play (internal track)** and **Upload
   Wear OS AAB to Google Play (Wear OS internal track)** are skipped.

Enable **Upload the AAB to Google Play (internal track)** only when the selected
ref is intended for distribution. Push-triggered Canary and Production workflows
always upload to the internal tracks.

## Wear OS delivery

Google Play separates distribution by form factor. Wear OS uses its own tracks,
identified by a `[prefix]:trackName` pattern (`wear:internal`,
`wear:production`, …), and a Wear OS track only accepts bundles that declare
`android.hardware.type.watch`.

Building `:app` alone leaves the Wear OS track without such a bundle, which
makes Play reject the release with:

```text
This release is not allowed to be published because it does not allow existing
users to upgrade to the newly added app bundles.

The APK or Android App Bundle in this track must request the
android.hardware.type.watch feature.
```

### One upload step per track

`r0adkll/upload-google-play` applies the version codes of **all** `releaseFiles`
to **every** track listed in `tracks` — it cannot route one artifact to one
track and another artifact to another. Passing both AABs in a single step would
therefore register the Wear OS bundle on the handheld track as well.

Each workflow consequently runs two independent upload steps:

Bundle directories are relative to `android/`, where `<variant>` is
`prodRelease` (Production) or `devRelease` (Canary).

| Module | Track | Bundle |
| --- | --- | --- |
| `:app` | `internal` | `app/build/outputs/bundle/<variant>/` |
| `:wearable` | `wear:internal` | `wearable/build/outputs/bundle/<variant>/` |

The Wear OS track ID depends on the form-factor configuration in Play Console.
Re-check it against the actual track ID whenever that configuration changes.

The Google Play service account needs publishing permission on **both** tracks.

### versionCode ordering

`:app` and `:wearable` share the same `applicationId`, so their version codes
live in one namespace and must never collide. Play also delivers the bundle with
the **highest** `versionCode` among those whose device requirements are met, and
`:app` (`minSdk 24`, no watch feature declared) satisfies Wear OS device
requirements too. `:wearable` must therefore always be `:app` + 1.

Because `:wearable` permanently occupies `:app` + 1, **one release consumes two
version codes**. `scripts/bump-version.js` therefore advances `:app` by 2 per
bump — advancing it by 1 would make this release's `:app` reuse the previous
release's `:wearable`, and Play rejects the upload with
`Version code ... has already been used.` The script also fails fast when an
explicit `--android-version` lands at or below the current Wear OS
`versionCode`.

`scripts/bump-version.js` enforces this automatically and corrects the value
even when the two have drifted or collided. Do not edit the Wear OS
`versionCode` by hand.

### Deobfuscation mapping

Both modules build with R8 enabled
(`android.enableMinifyInReleaseBuilds=true` in `android/gradle.properties`), and
each upload step passes its own module's `mapping.txt`. Keep the `mappingFile`
path aligned with the module of that step — a mismatched mapping silently
corrupts crash deobfuscation for the affected bundle.

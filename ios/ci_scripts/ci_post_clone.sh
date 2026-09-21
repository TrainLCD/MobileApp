#!/bin/bash

set -ueo pipefail

if ! printf '%s' "$SENTRY_PROPERTIES_BASE64" | base64 --decode > /Volumes/workspace/repository/ios/sentry.properties; then
  echo 'Error: Failed to write sentry.properties file'
  exit 1
fi

# どちらのスキームをビルドするかはワークフロー側で決まるため、両方を復元する
for scheme in Dev Prod; do
  var="GOOGLE_SERVICE_INFO_PLIST_$(printf '%s' "$scheme" | tr '[:lower:]' '[:upper:]')_BASE64"
  if [ -z "${!var:-}" ]; then
    echo "Error: $var is not set"
    exit 1
  fi
  if ! printf '%s' "${!var}" | base64 --decode > "/Volumes/workspace/repository/ios/Schemes/$scheme/GoogleService-Info.plist"; then
    echo "Error: Failed to write GoogleService-Info.plist for $scheme"
    exit 1
  fi
done

brew install node@24
brew link node@24 --force --overwrite

npm ci
pod install --repo-update
#!/bin/bash

set -ueo pipefail

if ! printf '%s' "$SENTRY_PROPERTIES_BASE64" | base64 --decode > /Volumes/workspace/repository/ios/sentry.properties; then
  echo 'Error: Failed to write sentry.properties file'
  exit 1
fi

brew install node@24
brew link node@24 --force --overwrite

npm ci
pod install --repo-update
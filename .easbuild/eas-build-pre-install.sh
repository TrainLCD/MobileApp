#!/bin/bash

echo $DOTENV_LOCAL | base64 --decode > .env.local

if [[ "$EAS_BUILD_PLATFORM" == "android" ]]; then
  echo "$DEV_GOOGLE_SERVICES_JSON" | base64 --decode > android/app/src/dev/google-services.json
  echo "$PROD_GOOGLE_SERVICES_JSON" | base64 --decode > android/app/src/prod/google-services.json
  echo "$SENTRY_PROPERTIES" | base64 --decode > android/sentry.properties
elif [[ "$EAS_BUILD_PLATFORM" == "ios" ]]; then
  echo "$PROD_GOOGLE_SERVICE_INFO_PLIST" | base64 --decode > ios/Schemes/Prod/GoogleService-Info.plist
  echo "$DEV_GOOGLE_SERVICE_INFO_PLIST" | base64 --decode > ios/Schemes/Dev/GoogleService-Info.plist
  echo "$SENTRY_PROPERTIES" | base64 --decode > ios/sentry.properties
fi
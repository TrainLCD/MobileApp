#!/bin/bash
mkdir -p /Volumes/workspace/repository/ios/Schemes/Dev

# 環境変数の存在確認
if [ -z "$GOOGLE_SERVICE_INFO_PLIST" ]; then
  echo "Error: GOOGLE_SERVICE_INFO_PLIST is not set"
  exit 1
fi

if [ -z "$XCODE_CANARY_APP" ]; then
  echo "Warning: XCODE_CANARY_APP is not set, defaulting to production"
  XCODE_CANARY_APP="false"
fi

# 出力先の設定
OUTPUT_DIR="/Volumes/workspace/repository/ios/Schemes"
if [ "$XCODE_CANARY_APP" = "true" ]; then
  OUTPUT_PATH="$OUTPUT_DIR/Dev/GoogleService-Info.plist"
else
  OUTPUT_PATH="$OUTPUT_DIR/Prod/GoogleService-Info.plist"
fi

# Base64デコードしてファイルに書き込み（環境変数がBase64エンコードされていると仮定）
echo "$GOOGLE_SERVICE_INFO_PLIST" | base64 --decode > "$OUTPUT_PATH"
if [ $? -ne 0 ]; then
  echo "Error: Failed to write plist file"
  exit 1
fi

# Sentryの設定確認
if [ -z "$SENTRY_PROPERTIES" ]; then
  echo "Error: SENTRY_PROPERTIES is not set"
  exit 1
fi

# Sentryの設定ファイル出力先の確認
SENTRY_OUTPUT_DIR="/Volumes/workspace/repository/ios"
if [ ! -d "$SENTRY_OUTPUT_DIR" ]; then
  echo "Error: Sentry output directory does not exist"
  exit 1
fi

# Sentryプロパティの書き込み
echo "$SENTRY_PROPERTIES" | tr -d '\r' > /Volumes/workspace/repository/ios/sentry.properties
if [ $? -ne 0 ]; then
  echo "Error: Failed to write sentry.properties file"
  exit 1
fi
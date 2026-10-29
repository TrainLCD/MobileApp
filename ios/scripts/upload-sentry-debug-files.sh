#!/bin/bash
# Xcode run-script phase. Xcode's working directory is ios/ (SRCROOT).
#
# @sentry/react-native 8.28.0 scripts/sentry-xcode-debug-files.sh prints
# "error: sentry-cli" and exits 0 when `debug-files upload` fails.
# A zero status does not fail the Xcode phase, so this wrapper does.
set -uo pipefail

cd "${SRCROOT:-.}"

official="../node_modules/@sentry/react-native/scripts/sentry-xcode-debug-files.sh"
log="$(mktemp)"
trap 'rm -f "$log"' EXIT

set +e
/bin/sh "$official" 2>&1 | tee "$log"
status="${PIPESTATUS[0]}"
set -e

if [ "$status" -ne 0 ]; then
  exit "$status"
fi

if grep -E -q '^error: sentry-cli' "$log"; then
  echo "error: sentry-cli debug files upload failed" >&2
  exit 1
fi

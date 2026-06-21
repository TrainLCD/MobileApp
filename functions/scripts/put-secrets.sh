#!/usr/bin/env bash
#
# Worker のシークレットを `wrangler secret bulk` で一括投入する。
# 値は KEY=VALUE 形式のファイル（既定: functions/.secrets.env, gitignore 済み）から読む。
# GOOGLE_PLAY_SA_KEY は環境変数 GOOGLE_PLAY_SA_KEY_FILE にサービスアカウント鍵 JSON の
# パスを渡せば、その中身をそのまま投入する。
#
# stdin パイプ（`echo ... | wrangler secret put`）は Windows/Git Bash で値が
# 届かないことがあるため、Node で一時 JSON を生成して `secret bulk` に渡す方式にしている。
#
# 使い方:
#   ./scripts/put-secrets.sh                      # 既定環境(dev) へ .secrets.env から
#   ./scripts/put-secrets.sh --env production     # production へ
#   SECRETS_FILE=.secrets.prod.env ./scripts/put-secrets.sh --env production
#   GOOGLE_PLAY_SA_KEY_FILE=./sa.json ./scripts/put-secrets.sh
#
set -euo pipefail

# このスクリプトの位置に関わらず functions/ をカレントにする
cd "$(dirname "$0")/.."

# --env <name> の解釈。不明引数や値欠落は意図しない環境への投入を招くため即失敗にする
WENV=""
if [[ $# -gt 0 ]]; then
  if [[ "$1" == "--env" ]]; then
    if [[ -z "${2:-}" ]]; then
      echo "--env には環境名が必要です" >&2
      exit 2
    fi
    WENV="$2"
    if [[ $# -gt 2 ]]; then
      echo "余分な引数: ${*:3}" >&2
      exit 2
    fi
  else
    echo "不明な引数: $1（使用法: put-secrets.sh [--env <name>]）" >&2
    exit 2
  fi
fi
wargs=()
[[ -n "$WENV" ]] && wargs=(--env "$WENV")

SECRETS_FILE="${SECRETS_FILE:-.secrets.env}"
TMP_JSON=".secrets.bulk.$$.json"

# 一時 JSON には平文シークレットが入るため、終了時（エラー含む）に必ず削除する
cleanup() { rm -f "$TMP_JSON"; }
trap cleanup EXIT

# .secrets.env + GOOGLE_PLAY_SA_KEY_FILE から bulk 用 JSON を生成（エスケープは Node 任せ）
if ! node scripts/build-secrets-json.mjs "$SECRETS_FILE" "$TMP_JSON"; then
  echo "投入対象のシークレットがありません（$SECRETS_FILE / GOOGLE_PLAY_SA_KEY_FILE を確認）" >&2
  exit 1
fi

echo "target env: ${WENV:-default(dev)}"
npx wrangler secret bulk "$TMP_JSON" ${wargs[@]+"${wargs[@]}"}

#!/usr/bin/env bash
#
# wrangler secret put を一括実行する。
# 値は KEY=VALUE 形式のファイル（既定: functions/.secrets.env, gitignore 済み）から読む。
# GOOGLE_SA_KEY だけは複数行 JSON を扱いやすいよう、環境変数 GOOGLE_SA_KEY_FILE に
# サービスアカウント鍵 JSON のパスを渡せば、その中身をそのまま投入する。
#
# 使い方:
#   functions/ で実行（どこから呼んでも functions/ に cd する）
#   ./scripts/put-secrets.sh                      # 既定環境(dev) へ .secrets.env から投入
#   ./scripts/put-secrets.sh --env production     # production へ
#   SECRETS_FILE=.secrets.prod.env ./scripts/put-secrets.sh --env production
#   GOOGLE_SA_KEY_FILE=./sa.json ./scripts/put-secrets.sh
#
set -euo pipefail

# このスクリプトの位置に関わらず functions/ をカレントにする
cd "$(dirname "$0")/.."

# --env <name> の解釈
WENV=""
if [[ "${1:-}" == "--env" && -n "${2:-}" ]]; then
  WENV="$2"
fi
wargs=()
[[ -n "$WENV" ]] && wargs=(--env "$WENV")

SECRETS_FILE="${SECRETS_FILE:-.secrets.env}"

# 投入するシークレット名（wrangler.jsonc のコメントと一致させること）
SECRET_NAMES=(
  SESSION_JWT_SECRET
  AZURE_SPEECH_KEY
  GOOGLE_SA_KEY
  OCTOKIT_PAT
  DISCORD_CS_WEBHOOK_URL
  DISCORD_CRASH_WEBHOOK_URL
  DISCORD_REVIEW_WEBHOOK_URL
)

# KEY=VALUE ファイルを連想配列へ読み込む（# コメント・空行は無視、前後のクォートを除去）
declare -A VALUES
if [[ -f "$SECRETS_FILE" ]]; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "${line//[[:space:]]/}" ]] && continue
    key="${line%%=*}"
    val="${line#*=}"
    key="${key#"${key%%[![:space:]]*}"}"   # ltrim
    key="${key%"${key##*[![:space:]]}"}"   # rtrim
    val="${val%\"}"; val="${val#\"}"        # 両端の " を除去
    val="${val%\'}"; val="${val#\'}"        # 両端の ' を除去
    VALUES["$key"]="$val"
  done < "$SECRETS_FILE"
else
  echo "warn: secrets file not found: $SECRETS_FILE (環境変数フォールバックのみ使用)" >&2
fi

# GOOGLE_SA_KEY はファイル指定があれば優先
if [[ -n "${GOOGLE_SA_KEY_FILE:-}" ]]; then
  if [[ -f "$GOOGLE_SA_KEY_FILE" ]]; then
    VALUES["GOOGLE_SA_KEY"]="$(cat "$GOOGLE_SA_KEY_FILE")"
  else
    echo "error: GOOGLE_SA_KEY_FILE not found: $GOOGLE_SA_KEY_FILE" >&2
    exit 1
  fi
fi

echo "target env: ${WENV:-default(dev)}"
failed=0
for name in "${SECRET_NAMES[@]}"; do
  # ファイル値 → 同名の環境変数 の順でフォールバック
  val="${VALUES[$name]:-${!name:-}}"
  if [[ -z "$val" ]]; then
    echo "skip (no value): $name"
    continue
  fi
  echo "putting: $name"
  if printf '%s' "$val" | npx wrangler secret put "$name" ${wargs[@]+"${wargs[@]}"}; then
    :
  else
    echo "  FAILED: $name" >&2
    failed=1
  fi
done

exit "$failed"

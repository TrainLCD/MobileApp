#!/usr/bin/env pwsh
#
# Worker のシークレットを `wrangler secret bulk` で一括投入する（PowerShell 版）。
# put-secrets.sh と同等。値は .secrets.env（KEY=VALUE, gitignore 済み）から読む。
# JSON 生成は共通の Node ヘルパー(build-secrets-json.mjs)に任せ、stdin パイプは使わない。
#
# 使い方:
#   .\scripts\put-secrets.ps1                          # 既定環境(dev)
#   .\scripts\put-secrets.ps1 -EnvName production       # production
#   $env:SECRETS_FILE='.secrets.prod.env'; .\scripts\put-secrets.ps1 -EnvName production
#   $env:GOOGLE_SA_KEY_FILE='.\sa.json'; .\scripts\put-secrets.ps1
#
[CmdletBinding()]
param(
  [string]$EnvName = ''
)

$ErrorActionPreference = 'Stop'
# native コマンド(node/npx)の終了コードは $LASTEXITCODE で手動判定する
$PSNativeCommandUseErrorActionPreference = $false

# このスクリプトの位置に関わらず functions/ をカレントにする
Set-Location (Join-Path $PSScriptRoot '..')

$SecretsFile = if ($env:SECRETS_FILE) { $env:SECRETS_FILE } else { '.secrets.env' }
$TmpJson = ".secrets.bulk.$PID.json"

try {
  # .secrets.env + GOOGLE_SA_KEY_FILE から bulk 用 JSON を生成（エスケープは Node 任せ）
  node scripts/build-secrets-json.mjs $SecretsFile $TmpJson
  if ($LASTEXITCODE -ne 0) {
    throw "投入対象のシークレットがありません（$SecretsFile / GOOGLE_SA_KEY_FILE を確認）"
  }

  $envArgs = @()
  if ($EnvName) { $envArgs = @('--env', $EnvName) }

  $target = if ($EnvName) { $EnvName } else { 'default(dev)' }
  Write-Host "target env: $target"

  npx wrangler secret bulk $TmpJson @envArgs
  if ($LASTEXITCODE -ne 0) {
    throw "wrangler secret bulk が失敗しました (exit $LASTEXITCODE)"
  }
}
finally {
  # 一時 JSON には平文シークレットが入るため、必ず削除する
  Remove-Item $TmpJson -ErrorAction SilentlyContinue
}

#!/bin/zsh

set -euo pipefail

brew install node@24
brew link node@24 --force --overwrite
npm install -g pnpm@10
pnpm approve-builds
pnpm i
pod install
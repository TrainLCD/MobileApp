#!/bin/zsh

set -euo pipefail

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
\. "$HOME/.nvm/nvm.sh"
nvm install 24
npm install -g pnpm@10
pnpm approve-builds
pnpm i
pod install
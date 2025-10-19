#!/bin/zsh
brew install cocoapods node ccache
npm install -g npm pnpm@10
pnpm i
pod install

#!/bin/sh

brew install cocoapods node@20
brew link node@20 --force

npm config set maxsockets 5

npm ci --loglevel verbose
pod install --repo-update

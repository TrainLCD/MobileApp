#!/bin/sh

brew install cocoapods node@20
brew link node@20 --force

npm ci --loglevel verbose
pod install --repo-update

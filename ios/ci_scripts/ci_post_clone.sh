#!/bin/sh

brew install cocoapods node
brew link node --force

npm install -g npm

npm install --loglevel verbose
pod install --repo-update

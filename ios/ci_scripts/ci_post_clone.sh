#!/bin/sh

brew install cocoapods node@20
brew link node@20 --force

npm ci
pod install

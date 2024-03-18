#!/bin/sh

brew install cocoapods node

npm config set maxsockets 1
npm ci --no-audit --progress=false
pod install

#!/bin/sh

brew install cocoapods node

npm install -g npm

npm config set maxsockets 1
npm ci --no-audit --progress=false --silent
pod install

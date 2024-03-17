#!/bin/sh

brew install cocoapods node

npm install -g npm

npm config set maxsockets 3
npm ci
pod install

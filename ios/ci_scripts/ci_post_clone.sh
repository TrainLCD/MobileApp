#!/bin/sh

brew install cocoapods node

npm config set maxsockets 3
npm i --no-audit --progress=false
pod install

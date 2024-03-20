#!/bin/sh

brew install cocoapods node

npm config set maxsockets 3
npm i
pod install

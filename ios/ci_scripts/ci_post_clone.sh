#!/bin/sh

brew install cocoapods node

npm install -g npm

npm ci
pod install

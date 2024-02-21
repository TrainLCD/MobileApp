#!/bin/sh

brew install cocoapods node

npm install -g npm

npm install --loglevel verbose
pod install

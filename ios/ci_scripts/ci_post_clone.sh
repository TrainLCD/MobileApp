#!/bin/sh

brew update
brew install cocoapods node@20 protobuf
brew link node@20

npm i
pod install

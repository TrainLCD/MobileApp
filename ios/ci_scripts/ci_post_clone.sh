#!/bin/sh

export HOMEBREW_NO_INSTALL_CLEANUP=TRUE
brew install cocoapods node@20 protobuf
brew link node@20

npm i
pod install

#!/bin/sh

export HOMEBREW_NO_INSTALL_CLEANUP=TRUE
brew install cocoapods node@18 protobuf
brew link node@18

npm i
pod install

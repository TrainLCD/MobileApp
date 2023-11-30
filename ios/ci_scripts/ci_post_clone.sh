#!/bin/sh

export HOMEBREW_NO_INSTALL_CLEANUP=TRUE
brew install cocoapods node protobuf

npm i
pod install

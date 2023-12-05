#!/bin/bash

export HOMEBREW_NO_INSTALL_CLEANUP=TRUE
brew update
brew install cocoapods node@20 protobuf
brew link node@20

npm install
pod install

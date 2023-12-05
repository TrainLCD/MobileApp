#!/bin/bash

export HOMEBREW_NO_INSTALL_CLEANUP=TRUE
brew update
brew install cocoapods node protobuf
npm install
pod install

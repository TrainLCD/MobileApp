#!/bin/sh

export HOMEBREW_NO_INSTALL_CLEANUP=TRUE
brew install cocoapods node protobuf

npm install
pod install

mkdir -p /Volumes/workspace/repository/ios/Schemes/Dev
echo $GOOGLE_SERVICE_INFO_PLIST > /Volumes/workspace/repository/ios/Schemes/Dev/GoogleService-Info.plist
echo $DOTENV_LOCAL > /Volumes/workspace/repository/.env.local

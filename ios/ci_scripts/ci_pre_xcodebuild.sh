#!/bin/sh

brew install cocoapods node@20 protobuf
brew link node@20

npm install
pod install

mkdir -p /Volumes/workspace/repository/ios/Schemes/Dev
echo $GOOGLE_SERVICE_INFO_PLIST > /Volumes/workspace/repository/ios/Schemes/Dev/GoogleService-Info.plist
echo $DOTENV_LOCAL > /Volumes/workspace/repository/.env.local

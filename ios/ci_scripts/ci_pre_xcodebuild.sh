#!/bin/bash
mkdir -p /Volumes/workspace/repository/ios/Schemes/Dev

if [ $XCODE_CANARY_APP = "true" ]; then
  echo $GOOGLE_SERVICE_INFO_PLIST > /Volumes/workspace/repository/ios/Schemes/Dev/GoogleService-Info.plist
else
  echo $GOOGLE_SERVICE_INFO_PLIST > /Volumes/workspace/repository/ios/Schemes/Prod/GoogleService-Info.plist
fi

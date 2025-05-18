#!/bin/zsh
brew install cocoapods node ccache
npm install -g npm @connectrpc/protoc-gen-connect-query@2 @connectrpc/protoc-gen-connect-es@1
npm ci
pod install

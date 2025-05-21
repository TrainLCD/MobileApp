#!/bin/zsh
brew install cocoapods node ccache
npm install -g npm @connectrpc/protoc-gen-connect-query@1 @connectrpc/protoc-gen-connect-es@1
npm ci --legacy-peer-deps # TODO: --legacy-peer-depsをしばく
pod install

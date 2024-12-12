#!/bin/bash
brew install cocoapods node ccache
npm install -g npm
npm ci
pod install

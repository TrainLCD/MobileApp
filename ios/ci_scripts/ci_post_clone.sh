#!/bin/sh

brew install cocoapods node@20

npm ci
pod install

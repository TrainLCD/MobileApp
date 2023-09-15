#!/bin/sh

echo $GOOGLE_SERVICE_INFO_PLIST > ../Schemes/Dev/GoogleService-Info.plist
echo $DOTENV_LOCAL > ./.env.local

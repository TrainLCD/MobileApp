/// <reference types="@welldone-software/why-did-you-render" />
/* eslint-disable global-require */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { ENABLE_WDYR } from 'react-native-dotenv';

if (process.env.NODE_ENV === 'development' && ENABLE_WDYR === 'true') {
  const whyDidYouRender = require('@welldone-software/why-did-you-render');
  whyDidYouRender(React, {
    trackAllPureComponents: true,
  });
}

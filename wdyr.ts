/// <reference types="@welldone-software/why-did-you-render" />
/* eslint-disable global-require */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';

if (
  process.env.NODE_ENV === 'development' &&
  process.env.ENABLE_WDYR_FOR_DEV === 'true'
) {
  const whyDidYouRender = require('@welldone-software/why-did-you-render');
  whyDidYouRender(React, {
    trackAllPureComponents: true,
  });
}

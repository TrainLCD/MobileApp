import React from 'react';
import type { CommonHeaderProps } from './Header.types';
import type { HeaderEastThemeConfig } from './HeaderEast';
import { HeaderEast, tokyoMetroConfig } from './HeaderEast';

const odakyuConfig: HeaderEastThemeConfig = {
  ...tokyoMetroConfig,
  gradientColors: [
    '#b0b0b0',
    '#a0a0a0',
    '#808080',
    '#b8b8b8',
    '#c8c8c8',
  ] as const,
  textColor: '#1a1a1a',
  rootStyle: {},
  divider: {
    ...tokyoMetroConfig.divider,
    color: 'dynamic',
  },
  secondaryDivider: {
    height: 2,
    color: '#888',
    extraStyle: {
      marginTop: 2,
    },
  },
  trainTypeBox: {
    ...tokyoMetroConfig.trainTypeBox,
    darkenColor: true,
    fontSizeScale: 1.2,
  },
};

const HeaderOdakyu: React.FC<CommonHeaderProps> = (props) => (
  <HeaderEast {...props} config={odakyuConfig} />
);

export default React.memo(HeaderOdakyu);

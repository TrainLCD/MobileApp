import React from 'react';
import isTablet from '~/utils/isTablet';
import type { CommonHeaderProps } from './Header.types';
import type { HeaderEastThemeConfig } from './HeaderEast';
import { HeaderEast, tokyoMetroConfig } from './HeaderEast';

const odakyuConfig: HeaderEastThemeConfig = {
  ...tokyoMetroConfig,
  gradientColors: ['#fcfcfc', '#a0a0a0', '#808080', '#dedede'] as const,
  gradientLocations: [0, 0.2, 0.21, 1] as const,
  textColor: '#1a1a1a',
  rootStyle: {},
  divider: {
    ...tokyoMetroConfig.divider,
    height: isTablet ? 8 : 6,
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

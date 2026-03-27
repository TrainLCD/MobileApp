import React from 'react';
import type { CommonHeaderProps } from './Header.types';
import type { HeaderEastThemeConfig } from './HeaderEast';
import { HeaderEast, tokyoMetroConfig } from './HeaderEast';

// TODO: グラデーションや色を小田急テーマ用に調整する
const odakyuConfig: HeaderEastThemeConfig = {
  ...tokyoMetroConfig,
};

const HeaderOdakyu: React.FC<CommonHeaderProps> = (props) => (
  <HeaderEast {...props} config={odakyuConfig} />
);

export default React.memo(HeaderOdakyu);

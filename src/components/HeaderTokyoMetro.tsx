import React from 'react';
import type { CommonHeaderProps } from './Header.types';
import { HeaderEast, tokyoMetroConfig } from './HeaderEast';

const HeaderTokyoMetro: React.FC<CommonHeaderProps> = (props) => (
  <HeaderEast {...props} config={tokyoMetroConfig} />
);

export default React.memo(HeaderTokyoMetro);

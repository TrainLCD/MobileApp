import React from 'react';
import type { CommonHeaderProps } from './Header.types';
import { HeaderEast, tyConfig } from './HeaderEast';

const HeaderTY: React.FC<CommonHeaderProps> = (props) => (
  <HeaderEast {...props} config={tyConfig} />
);

export default React.memo(HeaderTY);

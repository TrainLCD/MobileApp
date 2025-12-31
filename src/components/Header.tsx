import { useAtomValue } from 'jotai';
import React from 'react';
import { useCurrentStation } from '~/hooks';
import { APP_THEME } from '~/models/Theme';
import { themeAtom } from '~/store/atoms/theme';
import HeaderE235 from './HeaderE235';
import HeaderJL from './HeaderJL';
import HeaderJRKyushu from './HeaderJRKyushu';
import HeaderJRWest from './HeaderJRWest';
import HeaderLED from './HeaderLED';
import HeaderSaikyo from './HeaderSaikyo';
import HeaderTokyoMetro from './HeaderTokyoMetro';
import HeaderTY from './HeaderTY';

const Header = () => {
  const theme = useAtomValue(themeAtom);
  const station = useCurrentStation();

  if (!station) {
    return null;
  }

  switch (theme) {
    case APP_THEME.TOKYO_METRO:
    case APP_THEME.TOEI:
      return <HeaderTokyoMetro />;
    case APP_THEME.JR_WEST:
      return <HeaderJRWest />;
    case APP_THEME.YAMANOTE:
    case APP_THEME.JO:
      return <HeaderE235 isJO={theme === APP_THEME.JO} />;
    case APP_THEME.TY:
      return <HeaderTY />;
    case APP_THEME.SAIKYO:
      return <HeaderSaikyo />;
    case APP_THEME.LED:
      return <HeaderLED />;
    case APP_THEME.JL:
      return <HeaderJL />;
    case APP_THEME.JR_KYUSHU:
      return <HeaderJRKyushu />;
    default:
      return null;
  }
};

export default React.memo(Header);

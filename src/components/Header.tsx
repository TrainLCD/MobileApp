import React from 'react';
import { useRecoilValue } from 'recoil';
import { APP_THEME } from '../models/Theme';
import themeState from '../store/atoms/theme';
import CommonHeaderProps from './CommonHeaderProps';
import HeaderJRWest from './HeaderJRWest';
import HeaderSaikyo from './HeaderSaikyo';
import HeaderTokyoMetro from './HeaderTokyoMetro';
import HeaderTY from './HeaderTY';
import HeaderYamanote from './HeaderYamanote';

const Header = ({
  station,
  nextStation,
  isLast,
}: CommonHeaderProps): React.ReactElement => {
  const { theme } = useRecoilValue(themeState);

  switch (theme) {
    case APP_THEME.TOKYO_METRO:
    case APP_THEME.TOEI:
      return (
        <HeaderTokyoMetro
          station={station}
          nextStation={nextStation}
          isLast={isLast}
        />
      );
    case APP_THEME.JR_WEST:
      return (
        <HeaderJRWest
          station={station}
          nextStation={nextStation}
          isLast={isLast}
        />
      );
    case APP_THEME.YAMANOTE:
      return (
        <HeaderYamanote
          station={station}
          nextStation={nextStation}
          isLast={isLast}
        />
      );
    case APP_THEME.TY:
      return (
        <HeaderTY station={station} nextStation={nextStation} isLast={isLast} />
      );
    case APP_THEME.SAIKYO:
      return (
        <HeaderSaikyo
          station={station}
          nextStation={nextStation}
          isLast={isLast}
        />
      );
    default:
      return (
        <HeaderTokyoMetro
          station={station}
          nextStation={nextStation}
          isLast={isLast}
        />
      );
  }
};

export default React.memo(Header);

import React from 'react';
import { useRecoilValue } from 'recoil';
import AppTheme from '../models/Theme';
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
  line,
  isLast,
}: CommonHeaderProps): React.ReactElement => {
  const { theme } = useRecoilValue(themeState);

  switch (theme) {
    case AppTheme.TokyoMetro:
      return (
        <HeaderTokyoMetro
          station={station}
          nextStation={nextStation}
          line={line}
          isLast={isLast}
        />
      );
    case AppTheme.Yamanote:
      return (
        <HeaderYamanote
          state={state}
          station={station}
          stations={stations}
          nextStation={nextStation}
          line={line}
          lineDirection={lineDirection}
          boundStation={boundStation}
          isLast={isLast}
        />
      );
    case AppTheme.JRWest:
      return (
        <HeaderJRWest
          state={state}
          station={station}
          stations={stations}
          nextStation={nextStation}
          line={line}
          lineDirection={lineDirection}
          boundStation={boundStation}
          isLast={isLast}
        />
      );
    case AppTheme.TY:
      return (
        <HeaderTY
          station={station}
          nextStation={nextStation}
          line={line}
          isLast={isLast}
        />
      );
    case AppTheme.Saikyo:
      return (
        <HeaderSaikyo
          station={station}
          nextStation={nextStation}
          line={line}
          isLast={isLast}
        />
      );
    default:
      return (
        <HeaderTokyoMetro
          station={station}
          nextStation={nextStation}
          line={line}
          isLast={isLast}
        />
      );
  }
};

export default React.memo(Header);

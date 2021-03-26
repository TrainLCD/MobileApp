import React from 'react';
import { useRecoilValue } from 'recoil';
import HeaderTokyoMetro from '../HeaderTokyoMetro';
import { CommonHeaderProps } from './common';
import HeaderYamanote from '../HeaderYamanote';
import HeaderJRWest from '../HeaderJRWest';
import HeaderTY from '../HeaderTY';
import themeState from '../../store/atoms/theme';
import AppTheme from '../../models/Theme';
import HeaderSaikyo from '../HeaderSaikyo';

const Header = ({
  station,
  nextStation,
  boundStation,
  line,
  state,
  lineDirection,
  stations,
}: CommonHeaderProps): React.ReactElement => {
  const { theme } = useRecoilValue(themeState);
  switch (theme) {
    case AppTheme.TokyoMetro:
      return (
        <HeaderTokyoMetro
          state={state}
          station={station}
          stations={stations}
          nextStation={nextStation}
          line={line}
          lineDirection={lineDirection}
          boundStation={boundStation}
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
        />
      );
    case AppTheme.TY:
      return (
        <HeaderTY
          state={state}
          station={station}
          stations={stations}
          nextStation={nextStation}
          line={line}
          lineDirection={lineDirection}
          boundStation={boundStation}
        />
      );
    case AppTheme.Saikyo:
      return (
        <HeaderSaikyo
          state={state}
          station={station}
          stations={stations}
          nextStation={nextStation}
          line={line}
          lineDirection={lineDirection}
          boundStation={boundStation}
        />
      );
    default:
      return (
        <HeaderTokyoMetro
          state={state}
          station={station}
          stations={stations}
          nextStation={nextStation}
          line={line}
          lineDirection={lineDirection}
          boundStation={boundStation}
        />
      );
  }
};

export default Header;

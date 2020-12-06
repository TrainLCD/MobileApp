import React, { memo } from 'react';
import HeaderTokyoMetro from '../HeaderTokyoMetro';
import { CommonHeaderProps } from './common';
import HeaderYamanote from '../HeaderYamanote';
import HeaderJRWest from '../HeaderJRWest';
import HeaderDT from '../HeaderDT';
import { useRecoilValue } from 'recoil';
import themeState from '../../store/atoms/theme';
import AppTheme from '../../models/Theme';

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
    case AppTheme.DT:
      return (
        <HeaderDT
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
      break;
  }

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
};

export default memo(Header);

import React, { memo } from 'react';
import { useSelector } from 'react-redux';
import HeaderTokyoMetro from '../HeaderTokyoMetro';
import { CommonHeaderProps } from './common';
import { AppTheme } from '../../store/types/theme';
import HeaderYamanote from '../HeaderYamanote';
import HeaderJRWest from '../HeaderJRWest';
import { TrainLCDAppState } from '../../store';

const Header = ({
  station,
  nextStation,
  boundStation,
  line,
  state,
  lineDirection,
  stations,
}: CommonHeaderProps): React.ReactElement => {
  const { theme } = useSelector((appState: TrainLCDAppState) => appState.theme);
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

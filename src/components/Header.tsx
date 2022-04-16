import React from 'react';
import { useRecoilValue } from 'recoil';
import AppTheme from '../models/Theme';
import themeState from '../store/atoms/theme';
import CommonHeaderProps from './CommonHeaderProps';
import HeaderSaikyo from './HeaderSaikyo';
import HeaderSaikyoStopping from './HeaderSaikyoStopping';
import HeaderTokyoMetro from './HeaderTokyoMetro';
import HeaderTY from './HeaderTY';

const Header = ({
  station,
  nextStation,
  boundStation,
  line,
  state,
  lineDirection,
  stations,
  connectedNextLines,
  isLast,
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
          connectedNextLines={connectedNextLines}
          isLast={isLast}
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
          connectedNextLines={connectedNextLines}
          isLast={isLast}
        />
      );
    case AppTheme.Saikyo:
      if (state.startsWith('CURRENT') && boundStation) {
        return (
          <HeaderSaikyoStopping
            state={state}
            station={station}
            stations={stations}
            nextStation={nextStation}
            line={line}
            lineDirection={lineDirection}
            boundStation={boundStation}
            connectedNextLines={connectedNextLines}
            isLast={isLast}
          />
        );
      }
      return (
        <HeaderSaikyo
          state={state}
          station={station}
          stations={stations}
          nextStation={nextStation}
          line={line}
          lineDirection={lineDirection}
          boundStation={boundStation}
          connectedNextLines={connectedNextLines}
          isLast={isLast}
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
          connectedNextLines={connectedNextLines}
          isLast={isLast}
        />
      );
  }
};

export default React.memo(Header);

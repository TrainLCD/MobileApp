import React, { useMemo } from 'react';
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
  boundStation,
  line,
  state,
  lineDirection,
  stations,
  connectedNextLines,
}: CommonHeaderProps): React.ReactElement => {
  const { theme } = useRecoilValue(themeState);

  const isLast = useMemo(
    () =>
      lineDirection === 'INBOUND'
        ? stations.findIndex((s) => s.id === nextStation?.groupId) ===
          stations.length - 1
        : stations
            .slice()
            .reverse()
            .findIndex((s) => s.groupId === nextStation?.groupId) ===
          stations.length - 1,
    [lineDirection, nextStation?.groupId, stations]
  );

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

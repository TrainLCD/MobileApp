import React, { useEffect, useState } from 'react';
import { useRecoilValue } from 'recoil';
import AppTheme from '../models/Theme';
import themeState from '../store/atoms/theme';
import CommonHeaderProps from './CommonHeaderProps';
import HeaderSaikyo from './HeaderSaikyo';
import HeaderSaikyoDepature from './HeaderSaikyoDepature';
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
  const [isDepartured, setIsDepartured] = useState(false);

  // 埼京線始発テーマ用
  useEffect(() => {
    if (!state.startsWith('CURRENT')) {
      setIsDepartured(true);
    }
  }, [state]);

  // メイン画面から戻ったときに出発済みステートを初期化する
  useEffect(() => {
    if (!boundStation) {
      setIsDepartured(false);
    }
  }, [boundStation]);

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
      if (state.startsWith('CURRENT') && !isDepartured && boundStation) {
        return (
          <HeaderSaikyoDepature
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

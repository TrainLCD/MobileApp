import React, { useEffect, useState } from 'react';
import { useRecoilValue } from 'recoil';
import AppTheme from '../models/Theme';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import themeState from '../store/atoms/theme';
import CommonHeaderProps from './CommonHeaderProps';
import HeaderSaikyo from './HeaderSaikyo';
import HeaderSaikyoDepature from './HeaderSaikyoDepature';
import HeaderTokyoMetro from './HeaderTokyoMetro';
import HeaderTY from './HeaderTY';

const Header = ({
  station,
  nextStation,
  line,
  isLast,
}: CommonHeaderProps): React.ReactElement => {
  const { theme } = useRecoilValue(themeState);
  const { headerState } = useRecoilValue(navigationState);
  const { selectedBound } = useRecoilValue(stationState);
  const [isDepartured, setIsDepartured] = useState(false);

  // 埼京線始発テーマ用
  useEffect(() => {
    if (!headerState.startsWith('CURRENT')) {
      setIsDepartured(true);
    }
  }, [headerState]);

  // メイン画面から戻ったときに出発済みステートを初期化する
  useEffect(() => {
    if (!selectedBound) {
      setIsDepartured(false);
    }
  }, [selectedBound]);

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
      if (headerState.startsWith('CURRENT') && !isDepartured && selectedBound) {
        return (
          <HeaderSaikyoDepature
            station={station}
            nextStation={nextStation}
            line={line}
            isLast={isLast}
          />
        );
      }
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

import React, { memo } from 'react';
import { useSelector } from 'react-redux';
import { CommonLineBoardProps } from './common';
import { TrainLCDAppState } from '../../store';
import { AppTheme } from '../../store/types/theme';
import LineBoardEast from '../LineBoardEast';
import LineBoardWest from '../LineBoardWest';
import LineBoardDT from '../LineBoardDT';

const LineBoard = ({
  arrived,
  line,
  stations,
}: CommonLineBoardProps): React.ReactElement => {
  const { theme } = useSelector((state: TrainLCDAppState) => state.theme);
  if (theme === AppTheme.JRWest) {
    return <LineBoardWest arrived={arrived} stations={stations} line={line} />;
  }
  if (theme === AppTheme.DT || theme === AppTheme.TokyoMetro) {
    return (
      <LineBoardDT
        arrived={arrived}
        stations={stations}
        line={line}
        isMetro={theme === AppTheme.TokyoMetro}
      />
    );
  }

  return <LineBoardEast arrived={arrived} stations={stations} line={line} />;
};

export default memo(LineBoard);

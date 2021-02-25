import React, { memo } from 'react';
import { useRecoilValue } from 'recoil';
import { CommonLineBoardProps } from './common';
import LineBoardWest from '../LineBoardWest';
import LineBoardEast from '../LineBoardEast';
import themeState from '../../store/atoms/theme';
import AppTheme from '../../models/Theme';

const LineBoard: React.FC<CommonLineBoardProps> = ({
  arrived,
  line,
  stations,
  hasTerminus,
  trainType,
}: CommonLineBoardProps) => {
  const { theme } = useRecoilValue(themeState);
  if (theme === AppTheme.JRWest) {
    return <LineBoardWest arrived={arrived} stations={stations} line={line} />;
  }
  return (
    <LineBoardEast
      arrived={arrived}
      stations={stations}
      line={line}
      isMetro={theme === AppTheme.TokyoMetro}
      hasTerminus={hasTerminus}
      trainType={trainType}
    />
  );
};

export default memo(LineBoard);

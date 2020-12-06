import React, { memo } from 'react';
import { useRecoilValue } from 'recoil';
import { CommonLineBoardProps } from './common';
import LineBoardEast from '../LineBoardEast';
import LineBoardWest from '../LineBoardWest';
import LineBoardDT from '../LineBoardDT';
import themeState from '../../store/atoms/theme';
import AppTheme from '../../models/Theme';

const LineBoard = ({
  arrived,
  line,
  stations,
}: CommonLineBoardProps): React.ReactElement => {
  const { theme } = useRecoilValue(themeState);
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

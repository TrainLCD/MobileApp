import React, { memo } from 'react';
import { connect } from 'react-redux';
import { CommonLineBoardProps } from './common';
import { TrainLCDAppState } from '../../store';
import { AppTheme } from '../../store/types/theme';
import LineBoardEast from '../LineBoardEast';
import LineBoardWest from '../LineBoardWest';

const LineBoard = ({
  theme,
  arrived,
  line,
  stations,
}: CommonLineBoardProps): React.ReactElement => {
  if (theme === AppTheme.JRWest) {
    return <LineBoardWest arrived={arrived} stations={stations} line={line} />;
  }

  return <LineBoardEast arrived={arrived} stations={stations} line={line} />;
};

const memoizedLineBoard = memo(LineBoard);

const mapStateToProps = (
  state: TrainLCDAppState
): {
  theme: AppTheme;
} => ({
  theme: state.theme.theme,
});

export default connect(mapStateToProps, null)(memoizedLineBoard);

import React, { memo } from 'react';
import { connect } from 'react-redux';
import HeaderTokyoMetro from '../HeaderTokyoMetro';
import { CommonHeaderProps } from './common';
import { TrainLCDAppState } from '../../store';
import { AppTheme } from '../../store/types/theme';
import HeaderYamanote from '../HeaderYamanote';
import HeaderJRWest from '../HeaderJRWest';
import HeaderOsakaLoopLine from '../HeaderOsakaLoopLine';

const Header = ({
  station,
  nextStation,
  boundStation,
  line,
  state,
  lineDirection,
  stations,
  theme,
}: CommonHeaderProps): React.ReactElement => {
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
    case AppTheme.OsakaLoopLine:
      return (
        <HeaderOsakaLoopLine
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

const MemoizedHeader = memo(Header);

const mapStateToProps = (
  state: TrainLCDAppState
): {
  theme: AppTheme;
} => ({
  theme: state.theme.theme,
});

export default connect(mapStateToProps, null)(MemoizedHeader);

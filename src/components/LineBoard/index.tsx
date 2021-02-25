import React, { memo } from 'react';
import { useRecoilValue } from 'recoil';
import LineBoardWest from '../LineBoardWest';
import LineBoardEast from '../LineBoardEast';
import themeState from '../../store/atoms/theme';
import AppTheme from '../../models/Theme';
import { APITrainType, Line, Station } from '../../models/StationAPI';

export interface Props {
  arrived: boolean;
  line: Line;
  stations: Station[];
  theme?: AppTheme;
  hasTerminus: boolean;
  trainType: APITrainType;
}

const LineBoard: React.FC<Props> = ({
  arrived,
  line,
  stations,
  hasTerminus,
  trainType,
}: Props) => {
  const { theme } = useRecoilValue(themeState);
  const joinedLineIds = trainType?.lines.map((l) => l.id);
  const lineColors = stations
    .map((s) => s.lines.find((l) => joinedLineIds?.find((il) => l.id === il)))
    .map((s) => s?.lineColorC);

  if (theme === AppTheme.JRWest) {
    return (
      <LineBoardWest
        lineColors={lineColors}
        arrived={arrived}
        stations={stations}
        line={line}
      />
    );
  }
  return (
    <LineBoardEast
      arrived={arrived}
      stations={stations}
      line={line}
      isMetro={theme === AppTheme.TokyoMetro}
      hasTerminus={hasTerminus}
      lineColors={lineColors}
    />
  );
};

export default memo(LineBoard);

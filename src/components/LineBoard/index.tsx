import React, { memo } from 'react';
import { useRecoilValue } from 'recoil';
import LineBoardWest from '../LineBoardWest';
import LineBoardEast from '../LineBoardEast';
import themeState from '../../store/atoms/theme';
import AppTheme from '../../models/Theme';
import { APITrainType, Line, Station } from '../../models/StationAPI';

export interface Props {
  arrived: boolean;
  selectedLine: Line;
  stations: Station[];
  theme?: AppTheme;
  hasTerminus: boolean;
  trainType: APITrainType;
}

const LineBoard: React.FC<Props> = ({
  arrived,
  selectedLine,
  stations,
  hasTerminus,
  trainType,
}: Props) => {
  const { theme } = useRecoilValue(themeState);
  const joinedLineIds = trainType?.lines.map((l) => l.id);
  const belongingLines = stations.map((s) =>
    s.lines.find((l) => joinedLineIds?.find((il) => l.id === il))
  );
  const lineColors = belongingLines.map((s) => s?.lineColorC);

  if (theme === AppTheme.JRWest) {
    return (
      <LineBoardWest
        lineColors={lineColors}
        arrived={arrived}
        stations={stations}
        line={belongingLines[0] || selectedLine}
        lines={belongingLines}
      />
    );
  }
  return (
    <LineBoardEast
      arrived={arrived}
      stations={stations}
      line={belongingLines[0] || selectedLine}
      lines={belongingLines}
      isMetro={theme === AppTheme.TokyoMetro || theme === AppTheme.Yamanote}
      hasTerminus={hasTerminus}
      lineColors={lineColors}
    />
  );
};

export default memo(LineBoard);

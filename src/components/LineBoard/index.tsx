import React from 'react';
import { useRecoilValue } from 'recoil';
import LineBoardWest from '../LineBoardWest';
import LineBoardEast from '../LineBoardEast';
import themeState from '../../store/atoms/theme';
import AppTheme from '../../models/Theme';
import { APITrainType, Line, Station } from '../../models/StationAPI';
import LineBoardSaikyo from '../LineBoardSaikyo';

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
  const slicedStations = stations.slice(0, 8);
  const passFiltered = stations.filter((s) => !s.pass).slice(0, 8);

  const belongingLines = (() => {
    if (theme === AppTheme.JRWest) {
      return passFiltered.map((s) =>
        s.lines.find((l) => joinedLineIds?.find((il) => l.id === il))
      );
    }
    return slicedStations.map((s) =>
      s.lines.find((l) => joinedLineIds?.find((il) => l.id === il))
    );
  })();

  const lineColors = belongingLines.map((s) => s?.lineColorC);

  switch (theme) {
    case AppTheme.JRWest:
      return (
        <LineBoardWest
          lineColors={lineColors}
          arrived={arrived}
          stations={passFiltered}
          line={belongingLines[0] || selectedLine}
          lines={belongingLines}
        />
      );
    case AppTheme.Saikyo:
      return (
        <LineBoardSaikyo
          arrived={arrived}
          stations={slicedStations}
          line={belongingLines[0] || selectedLine}
          lines={belongingLines}
          hasTerminus={hasTerminus}
          lineColors={lineColors}
        />
      );
    default:
      return (
        <LineBoardEast
          arrived={arrived}
          stations={slicedStations}
          line={belongingLines[0] || selectedLine}
          lines={belongingLines}
          hasTerminus={hasTerminus}
          lineColors={lineColors}
        />
      );
  }
};

export default LineBoard;

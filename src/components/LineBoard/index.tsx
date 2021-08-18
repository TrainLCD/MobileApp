import React, { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import LineBoardWest from '../LineBoardWest';
import LineBoardEast from '../LineBoardEast';
import themeState from '../../store/atoms/theme';
import AppTheme from '../../models/Theme';
import LineBoardSaikyo from '../LineBoardSaikyo';
import navigationState from '../../store/atoms/navigation';
import stationState from '../../store/atoms/station';
import lineState from '../../store/atoms/line';

export interface Props {
  hasTerminus: boolean;
}

const LineBoard: React.FC<Props> = ({ hasTerminus }: Props) => {
  const { theme } = useRecoilValue(themeState);
  const { arrived, stations } = useRecoilValue(stationState);
  const { selectedLine } = useRecoilValue(lineState);
  const { trainType, leftStations } = useRecoilValue(navigationState);
  const joinedLineIds = trainType?.lines.map((l) => l.id);
  const slicedLeftStations = leftStations.slice(0, 8);

  const notPassStations = stations.filter((s) => !s.pass);
  const isPassing =
    notPassStations.findIndex((s) => s.id === leftStations[0]?.id) === -1;
  const nextStopStation = leftStations.filter((s) => !s.pass)[0];
  const lastStoppedStationIndex =
    notPassStations.findIndex((s) => s.id === nextStopStation?.id) - 1;
  const passFiltered = useMemo(() => {
    if (arrived) {
      leftStations.filter((s) => !s.pass).slice(0, 8);
    }
    if (isPassing && lastStoppedStationIndex > 0) {
      return [
        notPassStations[lastStoppedStationIndex],
        ...leftStations.filter((s) => !s.pass).slice(0, 8),
      ];
    }

    return leftStations.filter((s) => !s.pass).slice(0, 8);
  }, [
    arrived,
    isPassing,
    lastStoppedStationIndex,
    leftStations,
    notPassStations,
  ]);

  const belongingLines = (() => {
    if (theme === AppTheme.JRWest) {
      return passFiltered.map((s) =>
        s.lines.find((l) => joinedLineIds?.find((il) => l.id === il))
      );
    }
    return slicedLeftStations.map((s) =>
      s.lines.find((l) => joinedLineIds?.find((il) => l.id === il))
    );
  })();

  const lineColors = belongingLines.map((s) => s?.lineColorC);

  switch (theme) {
    case AppTheme.JRWest:
      return (
        <LineBoardWest
          lineColors={lineColors}
          stations={passFiltered}
          line={belongingLines[0] || selectedLine}
          lines={belongingLines}
        />
      );
    // TODO: 加工していないprops渡しを消して子コンポーネントでstateを取るようにする
    case AppTheme.Saikyo:
      return (
        <LineBoardSaikyo
          arrived={arrived}
          stations={slicedLeftStations}
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
          stations={slicedLeftStations}
          line={belongingLines[0] || selectedLine}
          lines={belongingLines}
          hasTerminus={hasTerminus}
          lineColors={lineColors}
        />
      );
  }
};

export default LineBoard;

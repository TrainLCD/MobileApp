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
import LineBoardYamanote from '../LineBoardYamanote';

export interface Props {
  hasTerminus: boolean;
}

const LineBoard: React.FC<Props> = ({ hasTerminus }: Props) => {
  const { theme } = useRecoilValue(themeState);
  const { arrived, stations, selectedDirection } = useRecoilValue(stationState);
  const { selectedLine } = useRecoilValue(lineState);
  const { trainType, leftStations } = useRecoilValue(navigationState);
  const joinedLineIds = trainType?.lines.map((l) => l.id);
  const slicedLeftStations = leftStations.slice(0, 8);

  const notPassStations = useMemo(
    () =>
      selectedDirection === 'INBOUND'
        ? stations.filter((s) => !s.pass)
        : stations
            .filter((s) => !s.pass)
            .slice()
            .reverse(),
    [selectedDirection, stations]
  );
  const isPassing = useMemo(
    () => notPassStations.findIndex((s) => s.id === leftStations[0]?.id) === -1,
    [leftStations, notPassStations]
  );
  const nextStopStation = useMemo(
    () => leftStations.filter((s) => !s.pass)[0],
    [leftStations]
  );
  const lastStoppedStationIndex = useMemo(
    () => notPassStations.findIndex((s) => s.id === nextStopStation?.id) - 1,
    [nextStopStation?.id, notPassStations]
  );
  const passFiltered = useMemo(() => {
    if (arrived) {
      leftStations.filter((s) => !s.pass).slice(0, 8);
    }

    if (isPassing && lastStoppedStationIndex >= 0) {
      return Array.from(
        new Set([
          notPassStations[lastStoppedStationIndex],
          ...leftStations.filter((s) => !s.pass).slice(0, 7),
        ])
      );
    }

    return leftStations.filter((s) => !s.pass).slice(0, 8);
  }, [
    arrived,
    isPassing,
    lastStoppedStationIndex,
    leftStations,
    notPassStations,
  ]);

  const belongingLines = useMemo(() => {
    if (theme === AppTheme.JRWest) {
      return passFiltered.map((s) =>
        s.lines.find((l) => joinedLineIds?.find((il) => l.id === il))
      );
    }
    return slicedLeftStations.map((s) =>
      s.lines.find((l) => joinedLineIds?.find((il) => l.id === il))
    );
  }, [joinedLineIds, passFiltered, slicedLeftStations, theme]);

  const lineColors = useMemo(
    () => belongingLines.map((s) => s?.lineColorC),
    [belongingLines]
  );

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
    case AppTheme.Yamanote:
      return (
        <LineBoardYamanote
          arrived={arrived}
          stations={slicedLeftStations}
          line={belongingLines[0] || selectedLine}
          hasTerminus={hasTerminus}
        />
      );
    default:
      return (
        <LineBoardEast
          arrived={arrived}
          stations={slicedLeftStations}
          line={belongingLines[0] || selectedLine}
          hasTerminus={hasTerminus}
          lines={belongingLines}
          lineColors={lineColors}
        />
      );
  }
};

export default React.memo(LineBoard);

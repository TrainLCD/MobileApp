import React, { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import useCurrentLine from '../../hooks/useCurrentLine';
import { APITrainType } from '../../models/StationAPI';
import AppTheme from '../../models/Theme';
import lineState from '../../store/atoms/line';
import navigationState from '../../store/atoms/navigation';
import stationState from '../../store/atoms/station';
import themeState from '../../store/atoms/theme';
import isTablet from '../../utils/isTablet';
import LineBoardEast from '../LineBoardEast';
import LineBoardSaikyo from '../LineBoardSaikyo';
import LineBoardWest from '../LineBoardWest';
import LineBoardYamanotePad from '../LineBoardYamanotePad';

export interface Props {
  hasTerminus: boolean;
}

const LineBoard: React.FC<Props> = ({ hasTerminus }: Props) => {
  const { theme } = useRecoilValue(themeState);
  const { arrived, station, stations, selectedDirection } =
    useRecoilValue(stationState);
  const { selectedLine } = useRecoilValue(lineState);
  const { trainType, leftStations } = useRecoilValue(navigationState);
  const currentLine = useCurrentLine();
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
    () => notPassStations.findIndex((s) => s.id === station?.id) === -1,
    [station?.id, notPassStations]
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
    const joinedLineIds = (trainType as APITrainType)?.lines.map((l) => l.id);

    const switchedStations =
      theme === AppTheme.JRWest ? passFiltered : slicedLeftStations;

    const currentLineLines = switchedStations.map((s) =>
      s.lines.find((l) => l.id === currentLine.id)
    );

    const currentLineIndex = joinedLineIds?.findIndex(
      (lid) => currentLine.id === lid
    );

    const slicedIds =
      selectedDirection === 'INBOUND'
        ? joinedLineIds?.slice(currentLineIndex + 1, joinedLineIds?.length)
        : joinedLineIds
            ?.slice()
            ?.reverse()
            ?.slice(
              joinedLineIds?.length - currentLineIndex,
              joinedLineIds?.length
            );

    const foundLines = switchedStations.map((s) =>
      s.lines.find((l) => slicedIds?.find((ild) => l.id === ild))
    );

    return currentLineLines.map((l, i) =>
      !l
        ? foundLines[i]
        : slicedLeftStations[i]?.lines.find((il) => l.id === il.id)
    );
  }, [
    currentLine.id,
    passFiltered,
    selectedDirection,
    slicedLeftStations,
    theme,
    trainType,
  ]);

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
      if (isTablet) {
        return (
          <LineBoardYamanotePad
            arrived={arrived}
            stations={slicedLeftStations}
            line={belongingLines[0] || selectedLine}
          />
        );
      }
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

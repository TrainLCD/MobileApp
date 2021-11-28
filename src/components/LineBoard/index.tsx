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
  const { arrived, station, selectedDirection } = useRecoilValue(stationState);
  const { selectedLine } = useRecoilValue(lineState);
  const { trainType, leftStations } = useRecoilValue(navigationState);
  const currentLine = useCurrentLine();
  const slicedLeftStations = leftStations.slice(0, 8);
  const currentStationIndex = slicedLeftStations.findIndex(
    (s) => s.groupId === station?.groupId
  );
  const slicedLeftStationsForYamanote = slicedLeftStations.slice(
    currentStationIndex,
    8
  );

  const belongingLines = useMemo(() => {
    const joinedLineIds = (trainType as APITrainType)?.lines.map((l) => l.id);

    const currentLineLines = slicedLeftStations.map((s) =>
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

    const foundLines = slicedLeftStations.map((s) =>
      s.lines.find((l) => slicedIds?.find((ild) => l.id === ild))
    );

    return currentLineLines.map((l, i) =>
      !l
        ? foundLines[i]
        : slicedLeftStations[i]?.lines.find((il) => l.id === il.id)
    );
  }, [currentLine.id, selectedDirection, slicedLeftStations, trainType]);

  const lineColors = useMemo(
    () => belongingLines.map((s) => s?.lineColorC),
    [belongingLines]
  );

  switch (theme) {
    case AppTheme.JRWest:
      return (
        <LineBoardWest
          lineColors={lineColors}
          stations={slicedLeftStations}
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
            stations={slicedLeftStationsForYamanote}
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

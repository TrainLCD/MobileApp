import { useAtomValue } from 'jotai';
import React, { useMemo } from 'react';
import type { Station } from '~/@types/graphql';
import {
  useCurrentLine,
  useCurrentTrainType,
  useDisplayCurrentStation,
  useGetLineMark,
  useNextStation,
  useTransferLines,
} from '~/hooks';
import { selectedLineAtom } from '~/store/atoms/line';
import { arrivedAtom } from '~/store/atoms/station';
import { isEnAtom } from '~/store/selectors/isEn';
import getIsPass from '~/utils/isPass';
import PadArch from './PadArch';

interface Props {
  stations: Station[];
}

const LineBoardYamanotePad: React.FC<Props> = ({ stations }: Props) => {
  const arrived = useAtomValue(arrivedAtom);
  // 現在地基準の現在駅(到着取りこぼし時はヘッダーの「まもなく」と一致する側へ自己修復)
  const station = useDisplayCurrentStation();
  const selectedLine = useAtomValue(selectedLineAtom);
  const isEn = useAtomValue(isEnAtom);

  const currentLine = useCurrentLine();
  const trainType = useCurrentTrainType();
  const getLineMarkFunc = useGetLineMark();
  const nextStation = useNextStation();
  const transferLines = useTransferLines();
  const switchedStation = useMemo(
    () =>
      arrived && station && !getIsPass(station)
        ? station
        : (nextStation ?? null),
    [arrived, nextStation, station]
  );

  const line = useMemo(
    () => currentLine || selectedLine,
    [currentLine, selectedLine]
  );

  const lineMarks = useMemo(
    () =>
      transferLines.map((tl) => {
        if (!switchedStation) {
          return null;
        }

        return getLineMarkFunc({
          line: tl,
          stationNumbers: switchedStation.stationNumbers,
        });
      }),
    [getLineMarkFunc, switchedStation, transferLines]
  );

  const slicedStations = useMemo(
    () =>
      stations
        .slice()
        .reverse()
        .slice(0, arrived ? stations.length : stations.length - 1),
    [arrived, stations]
  );

  const archStations = useMemo(
    () =>
      new Array(6)
        .fill(null)
        .map((_, i) => slicedStations[slicedStations.length - i])
        .reverse(),
    [slicedStations]
  );

  const numberingInfo = useMemo(
    () =>
      archStations.map((s) => {
        if (!s) {
          return null;
        }

        const lineMarkShape = getLineMarkFunc({
          line: s.line ?? undefined,
          stationNumbers: s.stationNumbers,
        });
        const stationNumber = s.stationNumbers?.[0]?.stationNumber;
        const lineColor =
          s.stationNumbers?.[0]?.lineSymbolColor ?? s.line?.color;

        return stationNumber && lineColor && lineMarkShape
          ? {
              stationNumber,
              lineColor,
              lineMarkShape,
            }
          : null;
      }),
    [archStations, getLineMarkFunc]
  );

  if (!line) {
    return null;
  }

  return (
    <PadArch
      stations={archStations}
      line={line}
      arrived={arrived}
      transferLines={transferLines}
      station={switchedStation}
      numberingInfo={numberingInfo}
      lineMarks={lineMarks}
      trainTypeLines={trainType?.lines ?? []}
      isEn={isEn}
    />
  );
};

export default React.memo(LineBoardYamanotePad);

import { useAtomValue } from 'jotai';
import React, { useMemo } from 'react';
import type { Station } from '~/@types/graphql';
import {
  useCurrentLine,
  useGetLineMark,
  useNextStation,
  useStationNumberIndexFunc,
  useTransferLines,
} from '~/hooks';
import lineState from '~/store/atoms/line';
import stationState from '~/store/atoms/station';
import { isEnAtom } from '~/store/selectors/isEn';
import getIsPass from '~/utils/isPass';
import PadArch from './PadArch';

interface Props {
  stations: Station[];
}

const LineBoardYamanotePad: React.FC<Props> = ({ stations }: Props) => {
  const { station, arrived } = useAtomValue(stationState);
  const { selectedLine } = useAtomValue(lineState);
  const isEn = useAtomValue(isEnAtom);

  const currentLine = useCurrentLine();
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
  const getStationNumberIndex = useStationNumberIndexFunc();

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
        const stationNumberIndex = getStationNumberIndex(s);

        const lineMarkShape = getLineMarkFunc({
          line: s.line ?? undefined,
        });
        const stationNumber =
          s.stationNumbers?.[stationNumberIndex]?.stationNumber;
        const lineColor =
          s.stationNumbers?.[stationNumberIndex]?.lineSymbolColor ??
          s.line?.color;

        return stationNumber && lineColor && lineMarkShape
          ? {
              stationNumber,
              lineColor,
              lineMarkShape,
            }
          : null;
      }),
    [archStations, getStationNumberIndex, getLineMarkFunc]
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
      isEn={isEn}
    />
  );
};

export default React.memo(LineBoardYamanotePad);

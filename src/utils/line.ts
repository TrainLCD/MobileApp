import type { Line, Station } from '~/@types/graphql';
import { TransportType } from '~/@types/graphql';

export const isBusLine = (
  line: Pick<Line, 'transportType'> | null | undefined
): boolean => line?.transportType === TransportType.Bus;

export const filterWithoutCurrentLine = (
  stations: Station[],
  currentLine: Line | null,
  stationIndex: number
): Line[] => {
  const currentStation = stations[stationIndex];
  if (!currentLine || !currentStation) {
    return [];
  }
  return (
    currentStation.lines?.filter(
      (line: Line) =>
        line.id !== currentLine.id &&
        line.nameKatakana !== currentLine.nameKatakana
    ) ?? []
  );
};

export const getCurrentStationLinesWithoutCurrentLine = (
  stations: Station[],
  selectedLine: Line | null
): Line[] => filterWithoutCurrentLine(stations, selectedLine, 0);

export const getNextStationLinesWithoutCurrentLine = (
  stations: Station[],
  selectedLine: Line | null,
  forceStationIndex?: number
): Line[] =>
  filterWithoutCurrentLine(stations, selectedLine, forceStationIndex ?? 1);

/**
 * バス停以外の駅ではバス路線を除外してフィルタリングする
 * バス停の場合はすべての路線を表示
 */
export const filterBusLinesForNonBusStation = <
  T extends Pick<Line, 'transportType'>,
>(
  currentLine: Pick<Line, 'transportType'> | null | undefined,
  lines: T[] | null | undefined
): T[] => {
  if (!lines) return [];
  return lines.filter((l) => isBusLine(currentLine) || !isBusLine(l));
};

/**
 * ローカライズされた路線名を取得する
 * 英語環境でnameRomanが空の場合、nameShortにフォールバックする（バス路線対応）
 */
export const getLocalizedLineName = (
  line: Pick<Line, 'nameShort' | 'nameRoman'> | null | undefined,
  isJapanese: boolean
): string => {
  if (!line) return '';
  if (isJapanese) return line.nameShort ?? '';
  return line.nameRoman || line.nameShort || '';
};

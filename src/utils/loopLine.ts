import i18n from 'i18n-js';
import { Line, Station } from '../models/StationAPI';

export const isYamanoteLine = (lineId: string): boolean => {
  return lineId === '11302';
};
export const isOsakaLoopLine = (lineId: string): boolean => {
  return lineId === '11623';
};

export const isLoopLine = (line: Line): boolean => {
  if (!line) {
    return false;
  }
  return isYamanoteLine(line.id) || isOsakaLoopLine(line.id);
};

const yamanoteLineDetectDirection = (
  loopIndexStation: Station,
  currentStation: Station
): string => {
  if (!currentStation) {
    return '';
  }
  if (loopIndexStation.groupId === currentStation.groupId) {
    return '';
  }
  switch (loopIndexStation.name) {
    case '新宿':
      return i18n.t('jyShinjuku');
    case '渋谷':
      return i18n.t('jyShibuya');
    case '池袋':
      return i18n.t('jyIkebukuro');
    case '東京':
      return i18n.t('jyTokyo');
    case '上野':
      return i18n.t('jyUeno');
    case '品川':
      return i18n.t('jyShinagawa');
    default:
      return '';
  }
};

export const inboundStationForLoopLine = (
  stations: Station[],
  index: number,
  selectedLine: Line
): { boundFor: string; station: Station } => {
  if (!selectedLine) {
    return null;
  }
  const leftStations = stations
    .slice()
    .reverse()
    .slice(stations.length - index, stations.length);
  const foundStations = leftStations
    .map((s) => ({
      station: s,
      boundFor: isYamanoteLine(selectedLine.id)
        ? yamanoteLineDetectDirection(s, stations[index])
        : null,
    }))
    .filter((s) => s.boundFor);
  // 配列の中に主要駅がない場合後ろに配列を連結して走査する
  const foundStation: { boundFor: string; station: Station } | undefined =
    foundStations[0];
  if (!foundStation) {
    const afterStations = stations.slice();
    const joinedStations = [...leftStations, ...afterStations];
    const newLeftStations = index
      ? joinedStations.slice(
          joinedStations.length - index,
          joinedStations.length
        )
      : joinedStations.slice().reverse().slice(1); // 大崎にいた場合品川方面になってしまうため
    const newFoundStations = newLeftStations
      .map((s) => ({
        station: s,
        boundFor: isYamanoteLine(selectedLine.id)
          ? yamanoteLineDetectDirection(s, stations[index])
          : null,
      }))
      .filter((s) => s.boundFor);
    return newFoundStations[0];
  }
  return foundStation;
};

export const outboundStationForLoopLine = (
  stations: Station[],
  index: number,
  selectedLine: Line
): { boundFor: string; station: Station } => {
  if (!selectedLine) {
    return null;
  }
  const leftStations = index
    ? stations.slice().slice(index)
    : stations.slice(index);
  const foundStations = leftStations
    .map((s) => ({
      station: s,
      boundFor: isYamanoteLine(selectedLine.id)
        ? yamanoteLineDetectDirection(s, stations[index])
        : null,
    }))
    .filter((s) => s.boundFor);
  // 配列の中に主要駅がない場合後ろに配列を連結して走査する
  const foundStation: { boundFor: string; station: Station } | undefined =
    foundStations[0];
  if (!foundStation) {
    const afterStations = stations.slice().reverse();
    const joinedStations = [...leftStations, ...afterStations];
    const newLeftStations = index
      ? joinedStations
          .slice()
          .reverse()
          .slice(joinedStations.length - index, joinedStations.length)
      : joinedStations.slice().reverse().slice(1); // 大崎にいた場合品川方面になってしまうため

    const newFoundStations = newLeftStations
      .map((s) => ({
        station: s,
        boundFor: isYamanoteLine(selectedLine.id)
          ? yamanoteLineDetectDirection(s, stations[index])
          : null,
      }))
      .filter((s) => s.boundFor);
    return newFoundStations[0];
  }
  return foundStation;
};

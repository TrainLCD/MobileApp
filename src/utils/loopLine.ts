import { Line, Station } from '../models/StationAPI';
import getTranslatedText from './translate';

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
      return getTranslatedText('jyShinjuku');
    case '渋谷':
      return getTranslatedText('jyShibuya');
    case '池袋':
      return getTranslatedText('jyIkebukuro');
    case '東京':
      return getTranslatedText('jyTokyo');
    case '上野':
      return getTranslatedText('jyUeno');
    case '品川':
      return getTranslatedText('jyShinagawa');
    default:
      return '';
  }
};

const osakaLoopLineDetectDirection = (
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
    case '京橋':
      return getTranslatedText('oKyobashi');
    case '大阪':
      return getTranslatedText('oOsaka');
    case '西九条':
      return `${getTranslatedText('oNishikujo')}`;
    case '新今宮':
      return getTranslatedText('oShinimamiya');
    case '天王寺':
      return getTranslatedText('oTennoji');
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
        : osakaLoopLineDetectDirection(s, stations[index]),
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
          : osakaLoopLineDetectDirection(s, stations[index]),
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
        : osakaLoopLineDetectDirection(s, stations[index]),
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
          : osakaLoopLineDetectDirection(s, stations[index]),
      }))
      .filter((s) => s.boundFor);
    return newFoundStations[0];
  }
  return foundStation;
};

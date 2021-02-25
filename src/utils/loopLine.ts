import { Line, Station } from '../models/StationAPI';
import { translate } from '../translation';

export const isYamanoteLine = (lineId: number): boolean => lineId === 11302;

const isOsakaLoopLine = (lineId: number): boolean => lineId === 11623;

export const isLoopLine = (line: Line): boolean => {
  if (!line) {
    return false;
  }
  return isYamanoteLine(line.id) || isOsakaLoopLine(line.id);
};

const yamanoteLineDetectDirection = (
  loopIndexStation: Station,
  currentStation: Station,
  isJa: boolean
): string => {
  if (!currentStation) {
    return '';
  }
  if (loopIndexStation.groupId === currentStation.groupId) {
    return '';
  }
  if (isJa) {
    switch (loopIndexStation.name) {
      case '新宿':
        return translate('jyShinjuku');
      case '渋谷':
        return translate('jyShibuya');
      case '池袋':
        return translate('jyIkebukuro');
      case '東京':
        return translate('jyTokyo');
      case '上野':
        return translate('jyUeno');
      case '品川':
        return translate('jyShinagawa');
      default:
        return '';
    }
  }
  switch (loopIndexStation.name) {
    case '新宿':
      return translate('jyShinjukuEn');
    case '渋谷':
      return translate('jyShibuyaEn');
    case '池袋':
      return translate('jyIkebukuroEn');
    case '東京':
      return translate('jyTokyoEn');
    case '上野':
      return translate('jyUenoEn');
    case '品川':
      return translate('jyShinagawaEn');
    default:
      return '';
  }
};

const osakaLoopLineDetectDirection = (
  loopIndexStation: Station,
  currentStation: Station,
  isJa: boolean
): string => {
  if (!currentStation) {
    return '';
  }
  if (loopIndexStation.groupId === currentStation.groupId) {
    return '';
  }
  if (isJa) {
    switch (loopIndexStation.name) {
      case '京橋':
        return translate('oKyobashi');
      case '大阪':
        return translate('oOsaka');
      case '西九条':
        return `${translate('oNishikujo')}`;
      case '新今宮':
        return translate('oShinimamiya');
      case '天王寺':
        return translate('oTennoji');
      default:
        return '';
    }
  }
  switch (loopIndexStation.name) {
    case '京橋':
      return translate('oKyobashiEn');
    case '大阪':
      return translate('oOsakaEn');
    case '西九条':
      return `${translate('oNishikujoEn')}`;
    case '新今宮':
      return translate('oShinimamiyaEn');
    case '天王寺':
      return translate('oTennojiEn');
    default:
      return '';
  }
};

export const inboundStationForLoopLine = (
  stations: Station[],
  index: number,
  selectedLine: Line,
  isJa: boolean
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
        ? yamanoteLineDetectDirection(s, stations[index], isJa)
        : osakaLoopLineDetectDirection(s, stations[index], isJa),
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
          ? yamanoteLineDetectDirection(s, stations[index], isJa)
          : osakaLoopLineDetectDirection(s, stations[index], isJa),
      }))
      .filter((s) => s.boundFor);
    return newFoundStations[0];
  }
  return foundStation;
};

export const outboundStationForLoopLine = (
  stations: Station[],
  index: number,
  selectedLine: Line,
  isJa: boolean
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
        ? yamanoteLineDetectDirection(s, stations[index], isJa)
        : osakaLoopLineDetectDirection(s, stations[index], isJa),
    }))
    .filter((s) => s.boundFor);
  // 配列の中に主要駅がない場合後ろに配列を連結して走査する
  const foundStation: { boundFor: string; station: Station } | undefined =
    foundStations[0];
  if (!foundStation) {
    const afterStations = isYamanoteLine(selectedLine.id)
      ? stations.slice().reverse()
      : stations.slice();
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
          ? yamanoteLineDetectDirection(s, stations[index], isJa)
          : osakaLoopLineDetectDirection(s, stations[index], isJa),
      }))
      .filter((s) => s.boundFor);
    return newFoundStations[0];
  }
  return foundStation;
};

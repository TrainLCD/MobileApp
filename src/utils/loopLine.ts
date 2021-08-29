import { HeaderLangState } from '../models/HeaderTransitionState';
import {
  APITrainType,
  APITrainTypeMinimum,
  Line,
  Station,
} from '../models/StationAPI';
import { TrainType } from '../models/TrainType';

export const isYamanoteLine = (lineId: number): boolean => lineId === 11302;

const isOsakaLoopLine = (lineId: number): boolean => lineId === 11623;

export const getIsLoopLine = (
  line: Line,
  trainType: TrainType | APITrainType | APITrainTypeMinimum
): boolean => {
  if (!line || trainType) {
    return false;
  }
  return isYamanoteLine(line.id) || isOsakaLoopLine(line.id);
};

const yamanoteLineDetectDirection = (
  loopIndexStation: Station,
  currentStation: Station,
  headerLangState: HeaderLangState
): string => {
  if (!currentStation) {
    return '';
  }
  if (loopIndexStation.groupId === currentStation.groupId) {
    return '';
  }

  const enDirection = (() => {
    switch (loopIndexStation.name) {
      case '新宿':
        return 'Shinjuku';
      case '渋谷':
        return 'Shibuya';
      case '池袋':
        return 'Ikebukuro';
      case '東京':
        return 'Tōkyō';
      case '上野':
        return 'Ueno';
      case '品川':
        return 'Shinagawa';
      default:
        return '';
    }
  })();
  const jaDirection = (() => {
    switch (loopIndexStation.name) {
      case '新宿':
        return '新宿';
      case '渋谷':
        return '渋谷';
      case '池袋':
        return '池袋';
      case '東京':
        return '東京';
      case '上野':
        return '上野';
      case '品川':
        return '品川';
      default:
        return '';
    }
  })();
  const zhDirection = (() => {
    switch (loopIndexStation.name) {
      case '新宿':
        return '新宿';
      case '渋谷':
        return '涩谷';
      case '池袋':
        return '池袋';
      case '東京':
        return '东京';
      case '上野':
        return '上野';
      case '品川':
        return '品川';
      default:
        return '';
    }
  })();
  const koDirection = (() => {
    switch (loopIndexStation.name) {
      case '新宿':
        return '신주쿠';
      case '渋谷':
        return '시부야';
      case '池袋':
        return '이케부쿠로';
      case '東京':
        return '도쿄';
      case '上野':
        return '우에노';
      case '品川':
        return '시나가와';
      default:
        return '';
    }
  })();

  switch (headerLangState) {
    case 'EN':
      return enDirection;
    case 'ZH':
      return zhDirection;
    case 'KO':
      return koDirection;
    default:
      return jaDirection;
  }
};

const osakaLoopLineDetectDirection = (
  loopIndexStation: Station,
  currentStation: Station,
  headerLangState: HeaderLangState
): string => {
  if (!currentStation) {
    return '';
  }
  if (loopIndexStation.groupId === currentStation.groupId) {
    return '';
  }
  const jaDirection = (() => {
    switch (loopIndexStation.name) {
      case '京橋':
        return '京橋';
      case '大阪':
        return '大阪';
      case '西九条':
        return '西九条';
      case '新今宮':
        return '新今宮';
      case '天王寺':
        return '天王寺';
      default:
        return '';
    }
  })();
  const enDirection = (() => {
    switch (loopIndexStation.name) {
      case '京橋':
        return 'Kyōbashi';
      case '大阪':
        return 'Ōsaka';
      case '西九条':
        return 'Nishikujō';
      case '新今宮':
        return 'Shin-Imamiya';
      case '天王寺':
        return 'Tennōji';
      default:
        return '';
    }
  })();
  const zhDirection = (() => {
    switch (loopIndexStation.name) {
      case '京橋':
        return '京桥';
      case '大阪':
        return '大阪';
      case '西九条':
        return '西九条';
      case '新今宮':
        return '新今宫';
      case '天王寺':
        return '天王寺';
      default:
        return '';
    }
  })();
  const koDirection = (() => {
    switch (loopIndexStation.name) {
      case '京橋':
        return '교바시';
      case '大阪':
        return '오사카';
      case '西九条':
        return '니시쿠조';
      case '新今宮':
        return '신이마미야';
      case '天王寺':
        return '덴노지';
      default:
        return '';
    }
  })();
  switch (headerLangState) {
    case 'EN':
      return enDirection;
    case 'ZH':
      return zhDirection;
    case 'KO':
      return koDirection;
    default:
      return jaDirection;
  }
};

export const inboundStationForLoopLine = (
  stations: Station[],
  index: number,
  selectedLine: Line,
  headerLangState: HeaderLangState
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
        ? yamanoteLineDetectDirection(s, stations[index], headerLangState)
        : osakaLoopLineDetectDirection(s, stations[index], headerLangState),
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
          ? yamanoteLineDetectDirection(s, stations[index], headerLangState)
          : osakaLoopLineDetectDirection(s, stations[index], headerLangState),
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
  headerLangState: HeaderLangState
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
        ? yamanoteLineDetectDirection(s, stations[index], headerLangState)
        : osakaLoopLineDetectDirection(s, stations[index], headerLangState),
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
          ? yamanoteLineDetectDirection(s, stations[index], headerLangState)
          : osakaLoopLineDetectDirection(s, stations[index], headerLangState),
      }))
      .filter((s) => s.boundFor);
    return newFoundStations[0];
  }
  return foundStation;
};

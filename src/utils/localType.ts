import {
  APITrainType,
  APITrainTypeMinimum,
  Station,
} from '../models/StationAPI';

// 100 = 普通
// 101 = 各駅停車
// 300 = 私鉄普通
// 301 = 私鉄各駅停車
export const getIsLocal = (tt: APITrainType | APITrainTypeMinimum): boolean =>
  tt?.typeId === 100 ||
  tt?.typeId === 101 ||
  tt?.typeId === 300 ||
  tt?.typeId === 301;
export const getIsRapid = (tt: APITrainType | APITrainTypeMinimum): boolean =>
  tt?.typeId === 102 || tt?.typeId === 302;

const getLocalType = (
  currentStation: Station
): APITrainType | APITrainTypeMinimum =>
  currentStation?.trainTypes?.find((tt) => getIsLocal(tt));

export default getLocalType;

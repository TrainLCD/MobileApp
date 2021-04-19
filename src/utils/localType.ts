import { APITrainType, Station } from '../models/StationAPI';

// 100 = 普通
// 101 = 各駅停車
// 300 = 私鉄普通
// 301 = 私鉄各駅停車
export const getIsLocal = (tt: APITrainType): boolean =>
  tt.id === 100 || tt.id === 101 || tt.id === 300 || tt.id === 301;
export const getIsRapid = (tt: APITrainType): boolean =>
  tt.id === 102 || tt.id === 302;

const getLocalType = (currentStation: Station): APITrainType =>
  currentStation?.trainTypes?.find((tt) => getIsLocal(tt));

export default getLocalType;

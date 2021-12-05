import { Station } from '../models/StationAPI';

// ２路線の接続駅は前の路線の最後の駅データを捨てる
const dropEitherJunctionStation = (stations: Station[]): Station[] =>
  stations.filter((s, i, arr): boolean => {
    const prv = arr[i - 1];
    if (prv && prv.groupId === s.groupId) {
      return !prv;
    }
    return true;
  });
export default dropEitherJunctionStation;

import { LineDirection } from '../models/Bound';
import { Station } from '../models/StationAPI';

// ２路線の接続駅は前の路線の最後の駅データを捨てる
const dropEitherJunctionStation = (
  stations: Station[],
  direction: LineDirection
): Station[] =>
  stations.filter((s, i, arr): boolean => {
    const station = direction === 'INBOUND' ? arr[i - 1] : arr[i + 1];
    if (station?.groupId === s.groupId) {
      return false;
    }
    return true;
  });
export default dropEitherJunctionStation;

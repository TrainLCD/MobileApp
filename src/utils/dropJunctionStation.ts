import type { Station } from '~/@types/graphql';
import type { LineDirection } from '../models/Bound';

// ２路線の接続駅は前の路線の最後の駅データを捨てる
const dropEitherJunctionStation = (
  stations: Station[],
  direction?: LineDirection | null
): Station[] =>
  stations.filter((s, i, arr): boolean => {
    const station = direction === 'INBOUND' ? arr[i - 1] : arr[i + 1];
    return station?.groupId !== s.groupId;
  });
export default dropEitherJunctionStation;

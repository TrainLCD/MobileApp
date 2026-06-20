import type { Station } from '~/@types/graphql';
import type { LineDirection } from '../models/Bound';
import { memoizeLastCalls } from './memoizeLastCalls';

// ２路線の接続駅は前の路線の最後の駅データを捨てる
// useNextStation(22ファイル)等から同一入力で繰り返し呼ばれるため、
// モジュールレベルでメモ化して走査の重複と結果配列の参照の揺れを無くす
const dropEitherJunctionStation = memoizeLastCalls(
  (stations: Station[], direction?: LineDirection | null): Station[] =>
    stations.filter((s, i, arr): boolean => {
      const station = direction === 'INBOUND' ? arr[i - 1] : arr[i + 1];
      return station?.groupId !== s.groupId;
    })
);
export default dropEitherJunctionStation;

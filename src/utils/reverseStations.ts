import type { Station } from '~/@types/graphql';
import { memoizeWeak } from './memoizeLastCalls';

// stations配列の逆順コピーを共有キャッシュ付きで返す。
// useNextStation / useLoopLine / useDisplayCurrentStation など複数のフックが
// 同一の配列に対してそれぞれ slice().reverse() を実行していたため、
// 入力配列の参照単位で結果を共有し、O(n)コピーの重複と参照の揺れを無くす。
const reverseStations = memoizeWeak((stations: Station[]): Station[] =>
  stations.slice().reverse()
);

export default reverseStations;

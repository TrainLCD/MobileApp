import { createStation } from '~/utils/test/factories';
import dropEitherJunctionStation from './dropJunctionStation';

describe('dropEitherJunctionStation', () => {
  // 大江戸線から代々木で山手線へ乗り換える駅リスト。代々木は両方の路線の駅として並ぶ
  const shinjuku = createStation(9930128, { groupId: 1130208 });
  const yoyogiOedo = createStation(9930127, { groupId: 1130207 });
  const yoyogiYamanote = createStation(1130207, { groupId: 1130207 });
  const harajuku = createStation(1130206, { groupId: 1130206 });
  const stations = [shinjuku, yoyogiOedo, yoyogiYamanote, harajuku];

  // 接続駅に着く前の「次の駅」は、いま乗っている路線の駅(ナンバリング E-26)にする。
  // 着いた後の読み替えは useCurrentStation が行う(#7058)
  it('INBOUNDでは進行方向で手前にある前の路線の駅を残す', () => {
    expect(
      dropEitherJunctionStation(stations, 'INBOUND').map((s) => s.id)
    ).toEqual([shinjuku.id, yoyogiOedo.id, harajuku.id]);
  });

  it('OUTBOUNDでは進行方向で手前にある前の路線の駅を残す', () => {
    // OUTBOUND は配列の逆順に進むので、原宿→代々木(山手線)→代々木(大江戸線)→新宿の順になる
    expect(
      dropEitherJunctionStation(stations, 'OUTBOUND').map((s) => s.id)
    ).toEqual([shinjuku.id, yoyogiYamanote.id, harajuku.id]);
  });

  it('接続駅が無ければ駅リストをそのまま返す', () => {
    const plain = [shinjuku, yoyogiYamanote, harajuku];
    expect(dropEitherJunctionStation(plain, 'INBOUND')).toEqual(plain);
    expect(dropEitherJunctionStation(plain, 'OUTBOUND')).toEqual(plain);
  });
});

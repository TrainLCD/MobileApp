import { findNearestStation } from './findNearestStation';
import { createStation } from './test/factories';

// 各停: 1,2,3,4,5  急行: 1,3,5 のようなケースを想定
const localStations = [
  createStation(1),
  createStation(2),
  createStation(3),
  createStation(4),
  createStation(5),
];
const expressStations = [createStation(1), createStation(3), createStation(5)];

describe('findNearestStation', () => {
  describe('INBOUND（index増加方向）', () => {
    it('現在駅が新リストにない場合、進行方向の最寄り駅を返す', () => {
      // 駅2（急行通過）にいる → 次の急行停車駅は駅3
      const result = findNearestStation(
        localStations,
        expressStations,
        2,
        'INBOUND'
      );
      expect(result?.groupId).toBe(3);
    });

    it('現在駅が新リストにない場合、直近の駅を飛ばして探す', () => {
      // 駅4（急行通過）にいる → 次の急行停車駅は駅5
      const result = findNearestStation(
        localStations,
        expressStations,
        4,
        'INBOUND'
      );
      expect(result?.groupId).toBe(5);
    });

    it('進行方向に停車駅がない場合、nullを返す', () => {
      // 駅5が最後で、それより先に急行停車駅がない
      const stationsEndingAt4 = [
        createStation(1),
        createStation(2),
        createStation(3),
        createStation(4),
      ];
      const express = [createStation(1), createStation(3)];
      const result = findNearestStation(
        stationsEndingAt4,
        express,
        4,
        'INBOUND'
      );
      expect(result).toBeNull();
    });
  });

  describe('OUTBOUND（index減少方向）', () => {
    it('現在駅が新リストにない場合、進行方向の最寄り駅を返す', () => {
      // 駅4（急行通過）にいる → OUTBOUNDなので駅3
      const result = findNearestStation(
        localStations,
        expressStations,
        4,
        'OUTBOUND'
      );
      expect(result?.groupId).toBe(3);
    });

    it('現在駅が新リストにない場合、直近の駅を飛ばして探す', () => {
      // 駅2（急行通過）にいる → OUTBOUNDなので駅1
      const result = findNearestStation(
        localStations,
        expressStations,
        2,
        'OUTBOUND'
      );
      expect(result?.groupId).toBe(1);
    });

    it('進行方向に停車駅がない場合、nullを返す', () => {
      const stationsStartingAt3 = [
        createStation(3),
        createStation(4),
        createStation(5),
      ];
      const express = [createStation(5)];
      // 駅3にいてOUTBOUND → index減少方向に停車駅なし
      const result = findNearestStation(
        stationsStartingAt3,
        express,
        3,
        'OUTBOUND'
      );
      expect(result).toBeNull();
    });
  });

  describe('エッジケース', () => {
    it('currentStationIdがnullの場合、nullを返す', () => {
      const result = findNearestStation(
        localStations,
        expressStations,
        null,
        'INBOUND'
      );
      expect(result).toBeNull();
    });

    it('currentStationIdがundefinedの場合、nullを返す', () => {
      const result = findNearestStation(
        localStations,
        expressStations,
        undefined,
        'INBOUND'
      );
      expect(result).toBeNull();
    });

    it('directionがnullの場合、nullを返す', () => {
      const result = findNearestStation(
        localStations,
        expressStations,
        2,
        null
      );
      expect(result).toBeNull();
    });

    it('現在駅が旧リストに存在しない場合、nullを返す', () => {
      const result = findNearestStation(
        localStations,
        expressStations,
        99,
        'INBOUND'
      );
      expect(result).toBeNull();
    });

    it('空の旧リストの場合、nullを返す', () => {
      const result = findNearestStation([], expressStations, 2, 'INBOUND');
      expect(result).toBeNull();
    });

    it('空の新リストの場合、nullを返す', () => {
      const result = findNearestStation(localStations, [], 2, 'INBOUND');
      expect(result).toBeNull();
    });

    it('旧リストにidがnullの駅がある場合、その駅をスキップして探す', () => {
      const stationsWithNull = [
        createStation(1),
        createStation(2),
        createStation(3, { id: null }),
        createStation(4),
        createStation(5),
      ];
      const express = [createStation(1), createStation(5)];
      // 駅2にいてINBOUND → 駅3はidがnullなのでスキップ → 駅5にマッチ
      const result = findNearestStation(
        stationsWithNull,
        express,
        2,
        'INBOUND'
      );
      expect(result?.id).toBe(5);
    });

    it('新リストにidがnullの駅がある場合、誤マッチしない', () => {
      const stationsWithNull = [
        createStation(1),
        createStation(2),
        createStation(3, { id: null }),
        createStation(4),
      ];
      const expressWithNull = [
        createStation(10, { id: null }),
        createStation(5),
      ];
      // 駅2にいてINBOUND → 駅3はidがnullなのでスキップ、駅4はexpressに無い → null
      const result = findNearestStation(
        stationsWithNull,
        expressWithNull,
        2,
        'INBOUND'
      );
      expect(result).toBeNull();
    });

    it('groupIdが同じでもidが異なる駅がある場合、id一致で現在地を特定する(都庁前の外回り/内回り相当)', () => {
      // 大江戸線の都庁前は外回り/内回りでgroupIdが同一だがidは別々。
      // groupIdだけで現在地を特定すると配列中で先に見つかる方(outer)に
      // 固定されてしまい、実際の現在地(inner)より手前の駅を誤って
      // 「次の停車駅」として返してしまう。
      const outer = createStation(9930100, { groupId: 100 });
      const between = createStation(50, { groupId: 50 });
      const inner = createStation(9930101, { groupId: 100 });
      const after = createStation(60, { groupId: 60 });
      const oldStations = [outer, between, inner, after];
      const newStations = [between, after];

      const result = findNearestStation(
        oldStations,
        newStations,
        inner.id,
        'INBOUND'
      );

      expect(result?.id).toBe(after.id);
    });

    it('OUTBOUND方向でも、groupIdが同じでもidが異なる駅がある場合はid一致で現在地を特定する', () => {
      // INBOUND版と同じ配置。groupIdだけでcurrentIdxを求めると常に先に出現する
      // outer(index 0)に固定され、OUTBOUND(index減少方向)には駅が無い
      // (currentIdx-1 = -1)ため誤ってnullを返してしまう。id一致ならinner
      // (index 2)を起点にでき、手前のbetweenを正しく返せる。
      const outer = createStation(9930100, { groupId: 100 });
      const between = createStation(50, { groupId: 50 });
      const inner = createStation(9930101, { groupId: 100 });
      const after = createStation(60, { groupId: 60 });
      const oldStations = [outer, between, inner, after];
      const newStations = [between, after];

      const result = findNearestStation(
        oldStations,
        newStations,
        inner.id,
        'OUTBOUND'
      );

      expect(result?.id).toBe(between.id);
    });
  });
});

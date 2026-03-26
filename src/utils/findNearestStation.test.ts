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
    it('currentGroupIdがnullの場合、nullを返す', () => {
      const result = findNearestStation(
        localStations,
        expressStations,
        null,
        'INBOUND'
      );
      expect(result).toBeNull();
    });

    it('currentGroupIdがundefinedの場合、nullを返す', () => {
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

    it('旧リストにgroupIdがnullの駅がある場合、その駅をスキップして探す', () => {
      const stationsWithNull = [
        createStation(1),
        createStation(2),
        createStation(3, { groupId: null }),
        createStation(4),
        createStation(5),
      ];
      const express = [createStation(1), createStation(5)];
      // 駅2にいてINBOUND → 駅3はgroupId=nullなのでスキップ → 駅5にマッチ
      const result = findNearestStation(
        stationsWithNull,
        express,
        2,
        'INBOUND'
      );
      expect(result?.groupId).toBe(5);
    });

    it('新リストにgroupIdがnullの駅がある場合、誤マッチしない', () => {
      const stationsWithNull = [
        createStation(1),
        createStation(2),
        createStation(3, { groupId: null }),
        createStation(4),
      ];
      const expressWithNull = [
        createStation(10, { groupId: null }),
        createStation(5),
      ];
      // 駅2にいてINBOUND → 駅3はgroupId=nullなのでスキップ、駅4はexpressに無い → null
      const result = findNearestStation(
        stationsWithNull,
        expressWithNull,
        2,
        'INBOUND'
      );
      expect(result).toBeNull();
    });
  });
});

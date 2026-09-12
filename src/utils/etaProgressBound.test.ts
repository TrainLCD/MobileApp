import type { Station } from '~/@types/graphql';
import { isBeyondEtaProgress } from './etaProgressBound';

// 経度0.01度 ≒ 900m。駅を南北に約1.1kmずつ並べた直線路線を用意する。
const makeStations = (count: number): Station[] =>
  Array.from(
    { length: count },
    (_, i) =>
      ({
        id: i + 1,
        latitude: 35.0 + i * 0.01,
        longitude: 139.0,
      }) as Station
  );

const stations = makeStations(10);

// 指定した駅のすぐ近く(約50m)の座標
const near = (idx: number) => ({
  latitude: (stations[idx].latitude as number) + 0.00045,
  longitude: stations[idx].longitude as number,
});

describe('isBeyondEtaProgress', () => {
  const base = {
    stations,
    toleranceStations: 1,
  };

  it('ETAの対象駅の手前にいる測位は許容する', () => {
    // 駅2を発車し駅3へ向かっている推定。実際は駅2と駅3の間
    expect(
      isBeyondEtaProgress({
        ...base,
        anchorStationId: 3,
        targetStationId: 4,
        ...near(2),
      })
    ).toBe(false);
  });

  it('対象駅の1駅先までは許容する(ETAの見積もり誤差ぶん)', () => {
    expect(
      isBeyondEtaProgress({
        ...base,
        anchorStationId: 3,
        targetStationId: 4,
        ...near(4),
      })
    ).toBe(false);
  });

  it('対象駅の2駅以上先を指す測位は棄却する', () => {
    expect(
      isBeyondEtaProgress({
        ...base,
        anchorStationId: 3,
        targetStationId: 4,
        ...near(5),
      })
    ).toBe(true);
  });

  it('アンカーより後方へ大きく外れた測位も棄却する', () => {
    expect(
      isBeyondEtaProgress({
        ...base,
        anchorStationId: 5,
        targetStationId: 6,
        ...near(2),
      })
    ).toBe(true);
  });

  // 進行方向はアンカー→対象駅の並びから決まるので、逆向きでも同じ基準になること。
  // アンカーidx5→対象idx4(降順)なら、idx3までが許容・idx2からが棄却で、
  // 昇順(アンカーidx2→対象idx3で、idx4まで許容・idx5から棄却)と対称。
  it('インデックスが降順に進む向きでも同じ基準で判定する', () => {
    expect(
      isBeyondEtaProgress({
        ...base,
        anchorStationId: 6,
        targetStationId: 5,
        ...near(2),
      })
    ).toBe(true);
    expect(
      isBeyondEtaProgress({
        ...base,
        anchorStationId: 6,
        targetStationId: 5,
        ...near(3),
      })
    ).toBe(false);
  });

  it('停車推定(アンカーと対象が同一駅)では前後1駅までを許容する', () => {
    expect(
      isBeyondEtaProgress({
        ...base,
        anchorStationId: 4,
        targetStationId: 4,
        ...near(4),
      })
    ).toBe(false);
    expect(
      isBeyondEtaProgress({
        ...base,
        anchorStationId: 4,
        targetStationId: 4,
        ...near(5),
      })
    ).toBe(true);
  });

  it('アンカー駅または対象駅が路線の駅一覧に無い場合は判定しない', () => {
    expect(
      isBeyondEtaProgress({
        ...base,
        anchorStationId: 999,
        targetStationId: 4,
        ...near(9),
      })
    ).toBe(false);
    expect(
      isBeyondEtaProgress({
        ...base,
        anchorStationId: 3,
        targetStationId: 999,
        ...near(9),
      })
    ).toBe(false);
  });

  it('座標を持たない駅しか無い場合は判定しない', () => {
    const noCoords = [{ id: 1 } as Station, { id: 2 } as Station];
    expect(
      isBeyondEtaProgress({
        stations: noCoords,
        anchorStationId: 1,
        targetStationId: 2,
        latitude: 35.0,
        longitude: 139.0,
        toleranceStations: 1,
      })
    ).toBe(false);
  });

  // 通過駅を含む路線では許容を「停車駅いくつぶん」で数える。index差のまま数えると、
  // 急行が次の停車駅まで進んだだけの正常な測位を棄却する(#6939の上限時間まで凍結する)。
  describe('通過駅がある場合(stopStationIds)', () => {
    // 停車駅は 1(idx0) / 5(idx4) / 7(idx6) / 9(idx8)。間は通過駅
    const stopStationIds = [1, 5, 7, 9];

    it('停車推定でも次の停車駅までは許容する(通過駅ぶんは数えない)', () => {
      expect(
        isBeyondEtaProgress({
          ...base,
          stopStationIds,
          anchorStationId: 1,
          targetStationId: 1,
          ...near(4),
        })
      ).toBe(false);
    });

    it('停車推定で2つ先の停車駅は棄却する', () => {
      expect(
        isBeyondEtaProgress({
          ...base,
          stopStationIds,
          anchorStationId: 1,
          targetStationId: 1,
          ...near(6),
        })
      ).toBe(true);
    });

    it('走行中は対象駅の次の停車駅までを許容する', () => {
      expect(
        isBeyondEtaProgress({
          ...base,
          stopStationIds,
          anchorStationId: 1,
          targetStationId: 5,
          ...near(6),
        })
      ).toBe(false);
      expect(
        isBeyondEtaProgress({
          ...base,
          stopStationIds,
          anchorStationId: 1,
          targetStationId: 5,
          ...near(8),
        })
      ).toBe(true);
    });

    it('後方側も停車駅単位で数える', () => {
      // アンカー(idx4)の1つ前の停車駅はidx0なので、その手前まで戻った測位は棄却する
      expect(
        isBeyondEtaProgress({
          ...base,
          stopStationIds,
          anchorStationId: 5,
          targetStationId: 7,
          ...near(0),
        })
      ).toBe(false);
      expect(
        isBeyondEtaProgress({
          ...base,
          stopStationIds,
          anchorStationId: 7,
          targetStationId: 9,
          ...near(0),
        })
      ).toBe(true);
    });

    it('全駅停車(停車駅リストが全駅)ならindex差で数えるのと同じ結果になる', () => {
      const allStops = stations.map((st) => st.id as number);
      expect(
        isBeyondEtaProgress({
          ...base,
          stopStationIds: allStops,
          anchorStationId: 3,
          targetStationId: 4,
          ...near(5),
        })
      ).toBe(true);
      expect(
        isBeyondEtaProgress({
          ...base,
          stopStationIds: allStops,
          anchorStationId: 3,
          targetStationId: 4,
          ...near(4),
        })
      ).toBe(false);
    });

    it('進行方向に停車駅が無い(終端・ETA区間の外)場合は端まで許容する', () => {
      expect(
        isBeyondEtaProgress({
          ...base,
          stopStationIds: [1, 5],
          anchorStationId: 5,
          targetStationId: 5,
          ...near(9),
        })
      ).toBe(false);
    });
  });
});

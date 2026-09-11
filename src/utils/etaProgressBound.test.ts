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
});

import type * as Location from 'expo-location';
import type { Station } from '~/@types/graphql';
import {
  buildDevDiagnosticsSnapshot,
  type DevDiagnosticsInput,
  formatDevDiagnosticsSnapshot,
} from './devDiagnosticsSnapshot';

const makeLocation = (
  latitude: number,
  longitude: number,
  accuracy: number | null,
  timestamp: number
): Location.LocationObject => ({
  coords: {
    latitude,
    longitude,
    accuracy,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: 12.5,
  },
  timestamp,
});

const baseInput: DevDiagnosticsInput = {
  nowMs: Date.UTC(2026, 8, 15, 4, 5, 6),
  appVersion: '10.15.1',
  buildNumber: '123',
  channel: 'canary',
  platform: 'ios',
  osVersion: '18.2',
  autoModeEnabled: false,
  telemetryEnabled: true,
  backgroundLocationTracking: true,
  rawLocation: makeLocation(35.732538, 139.670653, 312, 1_700_000_000_000),
  filteredLocation: makeLocation(35.7325, 139.6706, 312, 1_700_000_000_000),
  accuracyHistory: [20, 45, 310],
  filterAccuracyHistory: [20, 45, 310, 620],
  skipSmoothing: true,
  lineType: 'Subway',
  effectiveSpeedMps: 12.5,
  hasMeasuredSpeed: true,
  displacementHistory: [4, 9, 1200, 830],
  accuracyOutlier: false,
  pipelineCounts: {
    accepted: 41,
    rejectedByAccuracy: 3,
    rejectedAsDuplicate: 17,
    rejectedByEta: 2,
    rejectedBySpeed: 1,
  },
  heartbeat: {
    state: 'running',
    requested: 12,
    succeeded: 1,
    failed: 11,
    abandoned: 0,
    discarded: 0,
    teardowns: 2,
    recentTeardownReasons: ['foreground: true→false / AppState=background'],
    lastErrorMessage: '位置情報を取得できません',
  },
  maxPermitAccuracy: 1500,
  etaAssistEnabled: false,
  forceNotArrivedOnLowAccuracy: true,
  etaPhase: { kind: 'RUNNING', targetStationId: 9930135 },
  etaAnchor: {
    stationId: 9930134,
    kind: 'DEPARTED',
    observedAtMs: 1_700_000_000_000,
  },
  currentStation: { id: 9930136, name: '豊島園' } as Station,
  arrived: false,
  approaching: false,
  nearestStation: { id: 9930137, name: '練馬春日町' } as Station,
  distanceToNearestStation: 597,
  arrivedThreshold: 344.75,
  approachingThreshold: 539.5,
  nextStation: { id: 9930135, name: '練馬' } as Station,
  distanceToNextStation: '1,234',
};

describe('buildDevDiagnosticsSnapshot', () => {
  it('実効設定を座標と一緒に持ち出す', () => {
    // 設定が分からないと同じ測位でも挙動を説明できないため、
    // 座標だけを持ち出せても診断には足りない
    const snapshot = buildDevDiagnosticsSnapshot(baseInput);

    expect(snapshot.config).toEqual({
      maxPermitAccuracy: 1500,
      etaAssistEnabled: false,
      forceNotArrivedOnLowAccuracy: true,
      autoModeEnabled: false,
      telemetryEnabled: true,
      backgroundLocationTracking: true,
    });
    expect(snapshot.build).toEqual({
      appVersion: '10.15.1(123)',
      channel: 'canary',
      platform: 'ios',
      osVersion: '18.2',
    });
  });

  it('フィルタ前の生の測位と、アプリが使っている測位の両方を持つ', () => {
    // 片方だけだと「どの測位がどう補正されたか」が追えない
    const snapshot = buildDevDiagnosticsSnapshot(baseInput);

    expect(snapshot.location.raw).toMatchObject({
      latitude: 35.732538,
      longitude: 139.670653,
      accuracy: 312,
      timestamp: 1_700_000_000_000,
    });
    expect(snapshot.location.filtered).toMatchObject({
      latitude: 35.7325,
      longitude: 139.6706,
    });
    expect(snapshot.location.accuracyHistory).toEqual([20, 45, 310]);
  });

  it('平滑化の判定材料と結果を持つ', () => {
    // locationAtomの値だけでは、平滑化を掛けたのか生の座標を入れたのかが区別できない。
    // チャート用の精度履歴とは別に、判定に使われた履歴と結果を持ち出す
    const snapshot = buildDevDiagnosticsSnapshot(baseInput);

    expect(snapshot.filter).toEqual({
      skipSmoothing: true,
      lineType: 'Subway',
      accuracyHistory: [20, 45, 310, 620],
      accuracyOutlier: false,
      counts: {
        accepted: 41,
        rejectedByAccuracy: 3,
        rejectedAsDuplicate: 17,
        rejectedByEta: 2,
        rejectedBySpeed: 1,
      },
    });
    // チャート用とは別物であることを固定する(取り違えると地下鉄分岐の説明が付かない)
    expect(snapshot.filter.accuracyHistory).not.toEqual(
      snapshot.location.accuracyHistory
    );
  });

  it('測位が無い場合もnullで表現して壊れない', () => {
    const snapshot = buildDevDiagnosticsSnapshot({
      ...baseInput,
      rawLocation: null,
      filteredLocation: null,
    });

    expect(snapshot.location.raw).toBeNull();
    expect(snapshot.location.filtered).toBeNull();
  });

  it('タイムスタンプをISO文字列でも併記する', () => {
    // 生のミリ秒だけだと目視で時系列を追えない
    const snapshot = buildDevDiagnosticsSnapshot(baseInput);

    expect(snapshot.capturedAt).toBe('2026-09-15T04:05:06.000Z');
    expect(snapshot.location.raw?.timestampISO).toBe(
      new Date(1_700_000_000_000).toISOString()
    );
  });

  it('タイムスタンプを持たない測位でも例外を出さない', () => {
    // 診断情報の持ち出しで落ちては本末転倒。Date は不正な値へ toISOString すると送出する
    const withoutTimestamp = {
      coords: { speed: 10, accuracy: 15 },
    } as unknown as Location.LocationObject;

    const snapshot = buildDevDiagnosticsSnapshot({
      ...baseInput,
      rawLocation: withoutTimestamp,
    });

    expect(snapshot.location.raw).toMatchObject({
      accuracy: 15,
      timestamp: null,
      timestampISO: null,
      latitude: null,
    });
  });

  it('どの門で測位が落ちたかの内訳を持つ', () => {
    // 受理済みの座標だけでは「測位が届いていない」のか「届いているが捨てている」のかが
    // 区別できない。とくに重複排除は経過時間に現れないため、数えた値でしか読めない
    const snapshot = buildDevDiagnosticsSnapshot(baseInput);

    expect(snapshot.filter.counts.rejectedAsDuplicate).toBe(17);
    expect(snapshot.filter.counts.accepted).toBe(41);
  });

  it('補完測位の稼働状態と要求結果を持つ', () => {
    // 測位が一件も得られない区間では counts のどれも動かないため、内訳だけでは
    // 「要求を出していない」のか「出しても得られていない」のかが読めない
    const snapshot = buildDevDiagnosticsSnapshot(baseInput);

    expect(snapshot.heartbeat).toEqual({
      state: 'running',
      requested: 12,
      succeeded: 1,
      failed: 11,
      abandoned: 0,
      discarded: 0,
      teardowns: 2,
      recentTeardownReasons: ['foreground: true→false / AppState=background'],
      lastErrorMessage: '位置情報を取得できません',
    });
  });

  it('補完測位が止まっているときはその理由を持つ', () => {
    // 要求数が0でも、止まっているのか途絶が無かったのかで読みが真逆になる
    const snapshot = buildDevDiagnosticsSnapshot({
      ...baseInput,
      heartbeat: {
        state: 'power-saving',
        requested: 0,
        succeeded: 0,
        failed: 0,
        abandoned: 0,
        discarded: 0,
        teardowns: 0,
        recentTeardownReasons: [],
        lastErrorMessage: null,
      },
    });

    expect(snapshot.heartbeat.state).toBe('power-saving');
    expect(snapshot.heartbeat.requested).toBe(0);
  });

  it('入力座標の飛び幅を精度履歴と並べて持つ', () => {
    // 精度だけでは、位置が飛び続けているのか一点だけ外れたのかが分からない
    const snapshot = buildDevDiagnosticsSnapshot(baseInput);

    expect(snapshot.location.displacementHistory).toEqual([4, 9, 1200, 830]);
    // チャート用の精度履歴とは別物(取り違えると読みが逆になる)
    expect(snapshot.location.displacementHistory).not.toEqual(
      snapshot.location.accuracyHistory
    );
  });

  it('GPSが下している判定そのものを持つ', () => {
    // 現在駅・到着中・最寄り駅・実効閾値は、座標と駅座標からの逆算では再現できない
    // (直通運転では進行方向の逆算が成り立たない)
    const snapshot = buildDevDiagnosticsSnapshot(baseInput);

    expect(snapshot.state).toEqual({
      currentStationId: 9930136,
      currentStationName: '豊島園',
      arrived: false,
      approaching: false,
      nearestStationId: 9930137,
      nearestStationName: '練馬春日町',
      distanceToNearestStation: 597,
      arrivedThreshold: 344.75,
      approachingThreshold: 539.5,
    });
    // 到着判定の対象(最寄り駅)と表示上の次駅は別物
    expect(snapshot.state.nearestStationId).not.toBe(
      snapshot.derived.nextStationId
    );
  });

  it('ETAのフェーズとアンカーをそのまま持つ', () => {
    const snapshot = buildDevDiagnosticsSnapshot(baseInput);

    expect(snapshot.eta.phase).toEqual({
      kind: 'RUNNING',
      targetStationId: 9930135,
    });
    expect(snapshot.eta.anchor?.stationId).toBe(9930134);
  });
});

describe('formatDevDiagnosticsSnapshot', () => {
  it('貼り付けられる整形済みJSONを返す', () => {
    const text = formatDevDiagnosticsSnapshot(baseInput);

    expect(() => JSON.parse(text)).not.toThrow();
    expect(JSON.parse(text)).toEqual(buildDevDiagnosticsSnapshot(baseInput));
    // 読みながら貼れるようインデントする
    expect(text).toContain('\n  "config": {');
  });
});

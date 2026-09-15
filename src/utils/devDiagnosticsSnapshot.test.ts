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
  effectiveSpeedMps: 12.5,
  hasMeasuredSpeed: true,
  maxPermitAccuracy: 1500,
  etaAssistEnabled: false,
  etaPhase: { kind: 'RUNNING', targetStationId: 9930135 },
  etaAnchor: {
    stationId: 9930134,
    kind: 'DEPARTED',
    observedAtMs: 1_700_000_000_000,
  },
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

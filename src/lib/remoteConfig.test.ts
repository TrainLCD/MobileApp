import { MAX_PERMIT_ACCURACY } from '~/constants/location';
import { store } from '~/store';
import { etaAssistManualEnabledAtom } from '~/store/atoms/experimental';
import {
  getEtaFallbackArrivalConfirmMarginSec,
  getEtaFallbackMaxDurationMin,
  getMaxPermitAccuracy,
  isEtaAssistEnabled,
  isEtaAssistRemoteEnabled,
  isForceNotArrivedOnLowAccuracyEnabled,
  resetRemoteConfigCache,
  setupRemoteConfig,
} from './remoteConfig';

jest.mock('./workerApi', () => ({
  workerUrl: (path: string) => `https://worker.test${path}`,
}));

const fetchMock = jest.fn();
const origFetch = global.fetch;
global.fetch = fetchMock as unknown as typeof fetch;

const mockRemoteConfig = (body: unknown, ok = true) => {
  fetchMock.mockResolvedValueOnce({
    ok,
    status: ok ? 200 : 503,
    json: async () => body,
  });
};

afterEach(() => {
  jest.clearAllMocks();
  resetRemoteConfigCache();
  // 手動トグルは共有ストアに残るため、テスト間の汚染を防ぐべく毎回戻す。
  store.set(etaAssistManualEnabledAtom, false);
});

afterAll(() => {
  global.fetch = origFetch;
});

describe('getMaxPermitAccuracy', () => {
  it('falls back to MAX_PERMIT_ACCURACY before setup', () => {
    expect(getMaxPermitAccuracy()).toBe(MAX_PERMIT_ACCURACY);
  });

  it('returns the remote value after a successful setup', async () => {
    mockRemoteConfig({
      max_permit_accuracy: 2000,
      force_not_arrived_on_low_accuracy: true,
    });
    await setupRemoteConfig();
    expect(getMaxPermitAccuracy()).toBe(2000);
  });

  it('keeps the fallback when the remote value is zero or invalid', async () => {
    mockRemoteConfig({
      max_permit_accuracy: 0,
      force_not_arrived_on_low_accuracy: true,
    });
    await setupRemoteConfig();
    expect(getMaxPermitAccuracy()).toBe(MAX_PERMIT_ACCURACY);
  });
});

describe('isForceNotArrivedOnLowAccuracyEnabled', () => {
  it('falls back to true before setup', () => {
    expect(isForceNotArrivedOnLowAccuracyEnabled()).toBe(true);
  });

  it('returns the remote boolean after setup', async () => {
    mockRemoteConfig({
      max_permit_accuracy: 1500,
      force_not_arrived_on_low_accuracy: false,
    });
    await setupRemoteConfig();
    expect(isForceNotArrivedOnLowAccuracyEnabled()).toBe(false);
  });

  it('falls back to true when the boolean is missing', async () => {
    mockRemoteConfig({ max_permit_accuracy: 1500 });
    await setupRemoteConfig();
    expect(isForceNotArrivedOnLowAccuracyEnabled()).toBe(true);
  });
});

describe('isEtaAssistRemoteEnabled（マスタースイッチ）', () => {
  it('falls back to false before setup', () => {
    expect(isEtaAssistRemoteEnabled()).toBe(false);
  });

  it('returns the remote boolean after setup', async () => {
    mockRemoteConfig({
      max_permit_accuracy: 1500,
      force_not_arrived_on_low_accuracy: true,
      eta_assist_enabled: true,
    });
    await setupRemoteConfig();
    expect(isEtaAssistRemoteEnabled()).toBe(true);
  });

  it('falls back to false when the boolean is missing', async () => {
    mockRemoteConfig({ max_permit_accuracy: 1500 });
    await setupRemoteConfig();
    expect(isEtaAssistRemoteEnabled()).toBe(false);
  });
});

describe('isEtaAssistEnabled（Remote AND 手動トグル）', () => {
  it('Remoteと手動トグルの両方がONのときだけ有効', async () => {
    mockRemoteConfig({ eta_assist_enabled: true });
    await setupRemoteConfig();
    // Remoteがtrueでも手動トグルOFFなら無効
    expect(isEtaAssistEnabled()).toBe(false);
    // 手動トグルONで有効
    store.set(etaAssistManualEnabledAtom, true);
    expect(isEtaAssistEnabled()).toBe(true);
  });

  it('Remoteがfalseなら手動トグルONでも無効(マスターOFF)', async () => {
    store.set(etaAssistManualEnabledAtom, true);
    mockRemoteConfig({ eta_assist_enabled: false });
    await setupRemoteConfig();
    expect(isEtaAssistEnabled()).toBe(false);
  });

  it('セットアップ前(Remote未取得=false)は手動トグルONでも無効', () => {
    store.set(etaAssistManualEnabledAtom, true);
    expect(isEtaAssistEnabled()).toBe(false);
  });
});

describe('getEtaFallbackArrivalConfirmMarginSec', () => {
  it('falls back to 30 before setup', () => {
    expect(getEtaFallbackArrivalConfirmMarginSec()).toBe(30);
  });

  it('returns the remote value after a successful setup', async () => {
    mockRemoteConfig({
      max_permit_accuracy: 1500,
      eta_fallback_arrival_confirm_margin_sec: 45,
    });
    await setupRemoteConfig();
    expect(getEtaFallbackArrivalConfirmMarginSec()).toBe(45);
  });

  it('keeps the fallback when the remote value is zero or negative', async () => {
    mockRemoteConfig({
      max_permit_accuracy: 1500,
      eta_fallback_arrival_confirm_margin_sec: -5,
    });
    await setupRemoteConfig();
    expect(getEtaFallbackArrivalConfirmMarginSec()).toBe(30);
  });

  it('keeps the fallback when the remote value is non-finite', async () => {
    mockRemoteConfig({
      max_permit_accuracy: 1500,
      eta_fallback_arrival_confirm_margin_sec: Number.NaN,
    });
    await setupRemoteConfig();
    expect(getEtaFallbackArrivalConfirmMarginSec()).toBe(30);
  });
});

describe('getEtaFallbackMaxDurationMin', () => {
  it('falls back to 30 before setup', () => {
    expect(getEtaFallbackMaxDurationMin()).toBe(30);
  });

  it('returns the remote value after a successful setup', async () => {
    mockRemoteConfig({
      max_permit_accuracy: 1500,
      eta_fallback_max_duration_min: 60,
    });
    await setupRemoteConfig();
    expect(getEtaFallbackMaxDurationMin()).toBe(60);
  });

  it('keeps the fallback when the remote value is zero or invalid', async () => {
    mockRemoteConfig({
      max_permit_accuracy: 1500,
      eta_fallback_max_duration_min: 0,
    });
    await setupRemoteConfig();
    expect(getEtaFallbackMaxDurationMin()).toBe(30);
  });
});

describe('setupRemoteConfig', () => {
  it('fetches the remote config endpoint', async () => {
    mockRemoteConfig({
      max_permit_accuracy: 1234,
      force_not_arrived_on_low_accuracy: true,
    });
    await setupRemoteConfig();
    expect(fetchMock).toHaveBeenCalledWith('https://worker.test/config/remote');
  });

  it('throws when the endpoint responds with an error', async () => {
    mockRemoteConfig({}, false);
    await expect(setupRemoteConfig()).rejects.toThrow();
  });
});

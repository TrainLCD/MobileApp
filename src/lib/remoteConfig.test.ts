import { Platform } from 'react-native';
import { MAX_PERMIT_ACCURACY } from '~/constants/location';
import {
  getEtaFallbackArrivalConfirmMarginSec,
  getEtaFallbackMaxDurationMin,
  getMaxPermitAccuracy,
  isAIAgentFeatureEnabled,
  isEtaAssistEnabled,
  isForceNotArrivedOnLowAccuracyEnabled,
  isTTSFeatureEnabled,
  resetRemoteConfigCache,
  setupRemoteConfig,
  subscribeRemoteConfig,
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

// jest-expo の既定 Platform.OS は 'ios'。プラットフォーム別キーのテストでは明示的に
// 切り替え、afterEach で必ず元へ戻す。
const originalPlatformOS = Platform.OS;
const setPlatformOS = (os: typeof Platform.OS) => {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
};

afterEach(() => {
  jest.clearAllMocks();
  resetRemoteConfigCache();
  setPlatformOS(originalPlatformOS);
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

describe('isEtaAssistEnabled（Remoteマスタースイッチのみで判定）', () => {
  it('falls back to false before setup', () => {
    expect(isEtaAssistEnabled()).toBe(false);
  });

  it('RemoteがONなら自動的に有効(手動トグルなし)', async () => {
    mockRemoteConfig({
      max_permit_accuracy: 1500,
      force_not_arrived_on_low_accuracy: true,
      eta_assist_enabled: true,
    });
    await setupRemoteConfig();
    expect(isEtaAssistEnabled()).toBe(true);
  });

  it('RemoteがOFFなら無効(サーバー側キルスイッチ)', async () => {
    mockRemoteConfig({ max_permit_accuracy: 1500, eta_assist_enabled: false });
    await setupRemoteConfig();
    expect(isEtaAssistEnabled()).toBe(false);
  });

  it('falls back to false when the boolean is missing', async () => {
    mockRemoteConfig({ max_permit_accuracy: 1500 });
    await setupRemoteConfig();
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

describe('isTTSFeatureEnabled（サーバー側キルスイッチ）', () => {
  it('falls back to true before setup', () => {
    expect(isTTSFeatureEnabled()).toBe(true);
  });

  it('returns the remote boolean after setup', async () => {
    mockRemoteConfig({ max_permit_accuracy: 1500, tts_enabled: false });
    await setupRemoteConfig();
    expect(isTTSFeatureEnabled()).toBe(false);
  });

  it('RemoteがONなら有効', async () => {
    mockRemoteConfig({ max_permit_accuracy: 1500, tts_enabled: true });
    await setupRemoteConfig();
    expect(isTTSFeatureEnabled()).toBe(true);
  });

  it('falls back to true when the boolean is missing', async () => {
    mockRemoteConfig({ max_permit_accuracy: 1500 });
    await setupRemoteConfig();
    expect(isTTSFeatureEnabled()).toBe(true);
  });

  it('falls back to true when fetching remote config fails', async () => {
    mockRemoteConfig({}, false);
    await expect(setupRemoteConfig()).rejects.toThrow(
      'remote config fetch failed: 503'
    );
    expect(isTTSFeatureEnabled()).toBe(true);
  });
});

describe('isTTSFeatureEnabled（プラットフォーム別スイッチ）', () => {
  it('プラットフォーム別キーが未配信ならマスタースイッチに従う', async () => {
    mockRemoteConfig({ max_permit_accuracy: 1500, tts_enabled: true });
    await setupRemoteConfig();

    setPlatformOS('ios');
    expect(isTTSFeatureEnabled()).toBe(true);
    setPlatformOS('android');
    expect(isTTSFeatureEnabled()).toBe(true);
  });

  it('iOSのみ有効な配信ではAndroidが無効になる', async () => {
    mockRemoteConfig({
      max_permit_accuracy: 1500,
      tts_enabled: true,
      tts_enabled_ios: true,
      tts_enabled_android: false,
    });
    await setupRemoteConfig();

    setPlatformOS('ios');
    expect(isTTSFeatureEnabled()).toBe(true);
    setPlatformOS('android');
    expect(isTTSFeatureEnabled()).toBe(false);
  });

  it('Androidのみ有効な配信ではiOSが無効になる', async () => {
    mockRemoteConfig({
      max_permit_accuracy: 1500,
      tts_enabled: true,
      tts_enabled_ios: false,
      tts_enabled_android: true,
    });
    await setupRemoteConfig();

    setPlatformOS('ios');
    expect(isTTSFeatureEnabled()).toBe(false);
    setPlatformOS('android');
    expect(isTTSFeatureEnabled()).toBe(true);
  });

  it('両方のプラットフォーム別キーがfalseなら両OSで無効', async () => {
    mockRemoteConfig({
      max_permit_accuracy: 1500,
      tts_enabled: true,
      tts_enabled_ios: false,
      tts_enabled_android: false,
    });
    await setupRemoteConfig();

    setPlatformOS('ios');
    expect(isTTSFeatureEnabled()).toBe(false);
    setPlatformOS('android');
    expect(isTTSFeatureEnabled()).toBe(false);
  });

  it('マスタースイッチがfalseならプラットフォーム別キーがtrueでも無効', async () => {
    mockRemoteConfig({
      max_permit_accuracy: 1500,
      tts_enabled: false,
      tts_enabled_ios: true,
      tts_enabled_android: true,
    });
    await setupRemoteConfig();

    setPlatformOS('ios');
    expect(isTTSFeatureEnabled()).toBe(false);
    setPlatformOS('android');
    expect(isTTSFeatureEnabled()).toBe(false);
  });

  it('マスタースイッチ未配信でもプラットフォーム別キーで片方を止められる', async () => {
    mockRemoteConfig({
      max_permit_accuracy: 1500,
      tts_enabled_android: false,
    });
    await setupRemoteConfig();

    setPlatformOS('ios');
    expect(isTTSFeatureEnabled()).toBe(true);
    setPlatformOS('android');
    expect(isTTSFeatureEnabled()).toBe(false);
  });

  it('真偽値以外のプラットフォーム別キーは無視してフォールバックする', async () => {
    mockRemoteConfig({
      max_permit_accuracy: 1500,
      tts_enabled: true,
      tts_enabled_ios: 'false',
      tts_enabled_android: 0,
    });
    await setupRemoteConfig();

    setPlatformOS('ios');
    expect(isTTSFeatureEnabled()).toBe(true);
    setPlatformOS('android');
    expect(isTTSFeatureEnabled()).toBe(true);
  });

  it('iOS/Android以外のプラットフォームではマスタースイッチのみで判定する', async () => {
    mockRemoteConfig({
      max_permit_accuracy: 1500,
      tts_enabled: true,
      tts_enabled_ios: false,
      tts_enabled_android: false,
    });
    await setupRemoteConfig();

    setPlatformOS('web');
    expect(isTTSFeatureEnabled()).toBe(true);
  });

  it('resetRemoteConfigCache でプラットフォーム別キーも破棄される', async () => {
    mockRemoteConfig({
      max_permit_accuracy: 1500,
      tts_enabled: true,
      tts_enabled_android: false,
    });
    await setupRemoteConfig();

    setPlatformOS('android');
    expect(isTTSFeatureEnabled()).toBe(false);

    resetRemoteConfigCache();
    expect(isTTSFeatureEnabled()).toBe(true);
  });
});

describe('isAIAgentFeatureEnabled（サーバー側キルスイッチ）', () => {
  it('falls back to false before setup', () => {
    expect(isAIAgentFeatureEnabled()).toBe(false);
  });

  it('RemoteがONなら有効', async () => {
    mockRemoteConfig({ max_permit_accuracy: 1500, ai_agent_enabled: true });
    await setupRemoteConfig();
    expect(isAIAgentFeatureEnabled()).toBe(true);
  });

  it('RemoteがOFFなら無効', async () => {
    mockRemoteConfig({ max_permit_accuracy: 1500, ai_agent_enabled: false });
    await setupRemoteConfig();
    expect(isAIAgentFeatureEnabled()).toBe(false);
  });

  it('falls back to false when the boolean is missing', async () => {
    mockRemoteConfig({ max_permit_accuracy: 1500 });
    await setupRemoteConfig();
    expect(isAIAgentFeatureEnabled()).toBe(false);
  });

  it('falls back to false when fetching remote config fails', async () => {
    mockRemoteConfig({}, false);
    await expect(setupRemoteConfig()).rejects.toThrow(
      'remote config fetch failed: 503'
    );
    expect(isAIAgentFeatureEnabled()).toBe(false);
  });
});

describe('subscribeRemoteConfig（キャッシュ更新の購読）', () => {
  it('setupRemoteConfig 完了時にリスナーへ通知される', async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeRemoteConfig(listener);

    mockRemoteConfig({ max_permit_accuracy: 1500, tts_enabled: false });
    await setupRemoteConfig();

    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });

  it('購読解除後は通知されない', async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeRemoteConfig(listener);
    unsubscribe();

    mockRemoteConfig({ max_permit_accuracy: 1500, tts_enabled: false });
    await setupRemoteConfig();

    expect(listener).not.toHaveBeenCalled();
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

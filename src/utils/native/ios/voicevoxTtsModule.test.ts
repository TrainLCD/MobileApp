import type { getVoicevoxTtsModule as GetVoicevoxTtsModule } from './voicevoxTtsModule';

// react-native の index は各エクスポートを遅延 require するため、モジュールの
// 評価も getVoicevoxTtsModule の呼び出しも同じ分離レジストリの中で行う
// (外へ出てから呼ぶと外側の Platform を読んでしまう)。
const loadAndCall = (os: 'ios' | 'android', registerModule: boolean) => {
  let result: ReturnType<typeof GetVoicevoxTtsModule> | undefined;
  jest.isolateModules(() => {
    const rn = require('react-native') as {
      Platform: { OS: string };
      NativeModules: Record<string, unknown>;
    };
    Object.defineProperty(rn.Platform, 'OS', {
      value: os,
      configurable: true,
    });
    if (registerModule) {
      rn.NativeModules.VoicevoxTTSModule = fakeModule;
    } else {
      delete rn.NativeModules.VoicevoxTTSModule;
    }
    const { getVoicevoxTtsModule } = require('./voicevoxTtsModule') as {
      getVoicevoxTtsModule: typeof GetVoicevoxTtsModule;
    };
    result = getVoicevoxTtsModule();
  });
  return result;
};

const fakeModule = {
  setup: jest.fn(),
  synthesize: jest.fn(),
  release: jest.fn(),
  sha256: jest.fn(),
  setExcludedFromBackup: jest.fn(),
};

describe('getVoicevoxTtsModule', () => {
  it('[iOS] ネイティブモジュールが登録されていればそれを返す', () => {
    expect(loadAndCall('ios', true)).toBe(fakeModule);
  });

  it('[iOS] App Clip のようにモジュールが無いビルドでは null', () => {
    expect(loadAndCall('ios', false)).toBeNull();
  });

  // Android に VOICEVOX の実装は無い。万一同名のモジュールが登録されていても
  // JS 側では使わない (iOS 限定機能)。
  it('[Android] モジュールが登録されていても常に null', () => {
    expect(loadAndCall('android', true)).toBeNull();
  });
});

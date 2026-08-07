import { NativeModules, Platform } from 'react-native';

const iosUpdatePresetsSpy = jest.fn();
const androidUpdatePresetsSpy = jest.fn();

// presetsWidgetはimport時にNativeModulesを分割代入するため、読み込み前にモジュールを差し込む
(NativeModules as unknown as Record<string, unknown>).PresetsWidgetModule = {
  updatePresets: iosUpdatePresetsSpy,
};
(NativeModules as unknown as Record<string, unknown>).WidgetModule = {
  updatePresets: androidUpdatePresetsSpy,
};

const { updatePresetsWidget } =
  require('./presetsWidget') as typeof import('./presetsWidget');

// jest-expo の既定 Platform.OS は 'ios'。テストごとに切り替えてafterEachで元へ戻す。
const originalPlatformOS = Platform.OS;
const setPlatformOS = (os: typeof Platform.OS) => {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
};

const presets = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: '通勤',
    fromStationName: '東京',
    toStationName: '新宿',
    lineName: '山手線',
    lineColor: '#80C241',
    lineSymbol: 'JY',
  },
];

afterEach(() => {
  setPlatformOS(originalPlatformOS);
  jest.clearAllMocks();
});

describe('presetsWidget', () => {
  it('iOSではPresetsWidgetModuleへプリセットを渡す', () => {
    setPlatformOS('ios');
    updatePresetsWidget(presets);
    expect(iosUpdatePresetsSpy).toHaveBeenCalledWith(presets);
    expect(androidUpdatePresetsSpy).not.toHaveBeenCalled();
  });

  it('AndroidではWidgetModuleへプリセットを渡す', () => {
    setPlatformOS('android');
    updatePresetsWidget(presets);
    expect(androidUpdatePresetsSpy).toHaveBeenCalledWith(presets);
    expect(iosUpdatePresetsSpy).not.toHaveBeenCalled();
  });

  it('iOS/Android以外ではネイティブモジュールを呼ばない', () => {
    setPlatformOS('web');
    updatePresetsWidget(presets);
    expect(iosUpdatePresetsSpy).not.toHaveBeenCalled();
    expect(androidUpdatePresetsSpy).not.toHaveBeenCalled();
  });
});

import { NativeModules, Platform } from 'react-native';

const updateWidgetSpy = jest.fn();
const clearWidgetSpy = jest.fn();

// widgetModuleはimport時にNativeModulesを分割代入するため、読み込み前にモジュールを差し込む
(NativeModules as unknown as Record<string, unknown>).WidgetModule = {
  updateWidget: updateWidgetSpy,
  clearWidget: clearWidgetSpy,
};

const { clearWidget, updateWidget } =
  require('./widgetModule') as typeof import('./widgetModule');

// jest-expo の既定 Platform.OS は 'ios'。テストごとに切り替えてafterEachで元へ戻す。
const originalPlatformOS = Platform.OS;
const setPlatformOS = (os: typeof Platform.OS) => {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
};

const state = {
  lineName: '山手線',
  lineColor: '#80C241',
  lineSymbol: 'JY',
  boundStationName: '新宿・渋谷方面',
};

afterEach(() => {
  setPlatformOS(originalPlatformOS);
  jest.clearAllMocks();
});

describe('widgetModule', () => {
  it('Androidではネイティブモジュールへ乗車情報をそのまま渡す', () => {
    setPlatformOS('android');
    updateWidget(state);
    expect(updateWidgetSpy).toHaveBeenCalledWith(state);
  });

  it('Androidでは降車時にウィジェットの表示内容をクリアする', () => {
    setPlatformOS('android');
    clearWidget();
    expect(clearWidgetSpy).toHaveBeenCalledTimes(1);
  });

  it('Android以外ではネイティブモジュールを呼ばない', () => {
    setPlatformOS('ios');
    updateWidget(state);
    clearWidget();
    expect(updateWidgetSpy).not.toHaveBeenCalled();
    expect(clearWidgetSpy).not.toHaveBeenCalled();
  });
});

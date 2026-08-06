import { NativeModules, Platform } from 'react-native';

const { WidgetModule } = NativeModules;

/**
 * ホーム画面ウィジェットへ渡す乗車情報。
 * iOSのロック画面ウィジェットがApp Groupから読む項目と揃えている。
 */
export type WidgetState = {
  lineName: string;
  lineColor: string;
  lineSymbol: string;
  boundStationName: string;
};

export const updateWidget = (state: WidgetState) => {
  if (Platform.OS !== 'android') {
    return;
  }

  WidgetModule?.updateWidget?.(state);
};

export const clearWidget = () => {
  if (Platform.OS !== 'android') {
    return;
  }

  WidgetModule?.clearWidget?.();
};

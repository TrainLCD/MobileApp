import { NativeModules, Platform } from 'react-native';

// iOS はApp Groupへ書き込む専用モジュール、AndroidはRideウィジェットと同じWidgetModuleに相乗りする。
// ペイロードが両OSで完全に同一なため、ios/androidへ分けずにこのファイルで吸収する。
const { PresetsWidgetModule, WidgetModule } = NativeModules;

/**
 * ホーム画面のプリセットウィジェットが表示する1件分のプリセット。
 * ウィジェットはアプリのプロセスが落ちていても描画されるため、
 * 表示に必要な文字列はすべて解決済みの状態で渡す。
 */
export type PresetsWidgetItem = {
  /** SavedRoute.id。ディープリンク(`?preset=<id>`)のペイロードにもなる */
  id: string;
  name: string;
  fromStationName: string;
  toStationName: string;
  lineName: string;
  /** `#RRGGBB`。未取得時は空文字を渡し、ネイティブ側でブランドカラーへフォールバックする */
  lineColor: string;
  /** 路線記号。無い路線は空文字を渡し、ネイティブ側で路線名の先頭1文字へフォールバックする */
  lineSymbol: string;
};

export const updatePresetsWidget = (presets: PresetsWidgetItem[]) => {
  if (Platform.OS === 'ios') {
    PresetsWidgetModule?.updatePresets?.(presets);
    return;
  }
  if (Platform.OS === 'android') {
    WidgetModule?.updatePresets?.(presets);
  }
};

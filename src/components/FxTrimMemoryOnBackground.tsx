import React from 'react';
import { useTrimMemoryOnBackground } from '~/hooks/useTrimMemoryOnBackground';

/**
 * バックグラウンド遷移時に画像のメモリキャッシュを破棄するレンダーレスの副作用ホスト。
 *
 * テーマプレビューは設定画面 (ThemeSettings) に、乗車中の画面は Permitted 配下にあり
 * どちらか一方のツリーに置くと取りこぼすため、アプリのルート直下でマウントする。
 */
const FxTrimMemoryOnBackground: React.FC = () => {
  useTrimMemoryOnBackground();
  return null;
};

export default React.memo(FxTrimMemoryOnBackground);

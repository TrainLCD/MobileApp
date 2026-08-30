import { getLandscapeSafeAreaInsets } from './useLandscapeSafeAreaInsets';

// ノッチが上、ホームインジケータが下にある実機を想定した非対称な値
const INSETS = { top: 59, right: 21, bottom: 34, left: 39 };

describe('getLandscapeSafeAreaInsets', () => {
  it('端末が横向きのときは実機の余白をそのまま返す', () => {
    expect(getLandscapeSafeAreaInsets(INSETS, false)).toEqual(INSETS);
  });

  it('端末が縦向き(コンテンツが90deg回転)のときは辺を読み替える', () => {
    // コンテンツの左端は実機の上端、上端は実機の右端に対応する
    expect(getLandscapeSafeAreaInsets(INSETS, true)).toEqual({
      top: INSETS.right,
      right: INSETS.bottom,
      bottom: INSETS.left,
      left: INSETS.top,
    });
  });
});

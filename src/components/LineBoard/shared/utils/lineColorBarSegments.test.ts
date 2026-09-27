import {
  getLineColorBarSegments,
  getLineDotCenterX,
} from './lineColorBarSegments';

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

describe('getLineDotCenterX', () => {
  it('四角いドットは幅32pxの中心を返す', () => {
    expect(getLineDotCenterX(false)).toBe(16);
  });

  it('丸いドットは直径24pxの中心を返す', () => {
    expect(getLineDotCenterX(true)).toBe(12);
  });
});

describe('getLineColorBarSegments', () => {
  const OEDO = '#b6007a';
  const YAMANOTE = '#9acd32';

  it('次の駅と路線の色が同じなら1本で塗る', () => {
    expect(
      getLineColorBarSegments({
        left: -20,
        width: 62,
        splitX: 16,
        lineColors: [YAMANOTE, YAMANOTE],
        index: 0,
      })
    ).toEqual([{ left: -20, width: 62, color: YAMANOTE }]);
  });

  it('接続駅の枠はドットの中心で次の駅の路線の色に切り替える', () => {
    // 代々木(大江戸線の駅として並ぶ)の次が原宿(山手線)
    expect(
      getLineColorBarSegments({
        left: -20,
        width: 62,
        splitX: 16,
        lineColors: [OEDO, OEDO, YAMANOTE],
        index: 1,
      })
    ).toEqual([
      { left: -20, width: 36, color: OEDO },
      { left: 16, width: 26, color: YAMANOTE },
    ]);
  });

  it('接続駅の手前の駅の枠は切り替えない', () => {
    expect(
      getLineColorBarSegments({
        left: -20,
        width: 62,
        splitX: 16,
        lineColors: [OEDO, OEDO, YAMANOTE],
        index: 0,
      })
    ).toEqual([{ left: -20, width: 62, color: OEDO }]);
  });

  it('接続駅に着いた後は先頭の枠のドットより手前を着いてきた路線の色で塗る', () => {
    // 着いた後は先頭の代々木が山手線の駅に差し替わる
    expect(
      getLineColorBarSegments({
        left: -32,
        width: 62,
        splitX: 16,
        lineColors: [YAMANOTE, YAMANOTE],
        arrivingLineColor: OEDO,
        index: 0,
      })
    ).toEqual([
      { left: -32, width: 48, color: OEDO },
      { left: 16, width: 14, color: YAMANOTE },
    ]);
  });

  it('着いてきた路線の色は先頭の枠にだけ使う', () => {
    expect(
      getLineColorBarSegments({
        left: -20,
        width: 62,
        splitX: 16,
        lineColors: [YAMANOTE, YAMANOTE],
        arrivingLineColor: OEDO,
        index: 1,
      })
    ).toEqual([{ left: -20, width: 62, color: YAMANOTE }]);
  });

  it('塗る範囲が切り替える位置から始まるときは全体を次の駅の路線の色で塗る', () => {
    expect(
      getLineColorBarSegments({
        left: 4.8,
        width: 24.8,
        splitX: 4.8,
        lineColors: [OEDO, OEDO, YAMANOTE],
        index: 1,
      })
    ).toEqual([{ left: 4.8, width: 24.8, color: YAMANOTE }]);
  });

  it('最後の枠はその駅の路線の色のまま塗る', () => {
    expect(
      getLineColorBarSegments({
        left: -20,
        width: 62,
        splitX: 16,
        lineColors: [OEDO, YAMANOTE],
        index: 1,
      })
    ).toEqual([{ left: -20, width: 62, color: YAMANOTE }]);
  });
});

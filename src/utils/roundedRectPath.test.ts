import { buildRoundedRectPath } from './roundedRectPath';

const BASE = { x: 10, y: 20, width: 100, height: 40 };

describe('buildRoundedRectPath', () => {
  it('4隅とも同じ半径のパスを生成する', () => {
    const path = buildRoundedRectPath({
      ...BASE,
      topLeft: 8,
      topRight: 8,
      bottomRight: 8,
      bottomLeft: 8,
    });

    expect(path).toBe(
      'M 18 20 H 102 A 8 8 0 0 1 110 28 V 52 A 8 8 0 0 1 102 60 H 18 A 8 8 0 0 1 10 52 V 28 A 8 8 0 0 1 18 20 Z'
    );
  });

  it('隅ごとに異なる半径を反映する', () => {
    const path = buildRoundedRectPath({
      ...BASE,
      topLeft: 0,
      topRight: 0,
      bottomRight: 16,
      bottomLeft: 16,
    });

    // 上辺は直角（半径0）、下辺のみ角丸になる
    expect(path).toBe(
      'M 10 20 H 110 A 0 0 0 0 1 110 20 V 44 A 16 16 0 0 1 94 60 H 26 A 16 16 0 0 1 10 44 V 20 A 0 0 0 0 1 10 20 Z'
    );
  });

  it('全隅が0のときは直角の矩形になる', () => {
    const path = buildRoundedRectPath({
      ...BASE,
      topLeft: 0,
      topRight: 0,
      bottomRight: 0,
      bottomLeft: 0,
    });

    expect(path).toBe(
      'M 10 20 H 110 A 0 0 0 0 1 110 20 V 60 A 0 0 0 0 1 110 60 H 10 A 0 0 0 0 1 10 60 V 20 A 0 0 0 0 1 10 20 Z'
    );
  });

  it('短辺の半分を超える半径は頭打ちにする', () => {
    const path = buildRoundedRectPath({
      ...BASE,
      topLeft: 999,
      topRight: 999,
      bottomRight: 999,
      bottomLeft: 999,
    });

    // height 40 なので半径は 20 に丸められる
    expect(path).toContain('A 20 20 0 0 1');
    expect(path).not.toContain('999');
  });

  it('負の半径は0として扱う', () => {
    const path = buildRoundedRectPath({
      ...BASE,
      topLeft: -8,
      topRight: 4,
      bottomRight: 4,
      bottomLeft: 4,
    });

    expect(path).toBe(
      'M 10 20 H 106 A 4 4 0 0 1 110 24 V 56 A 4 4 0 0 1 106 60 H 14 A 4 4 0 0 1 10 56 V 20 A 0 0 0 0 1 10 20 Z'
    );
  });

  it('サイズが0でも不正なパスにならない', () => {
    const path = buildRoundedRectPath({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      topLeft: 12,
      topRight: 12,
      bottomRight: 12,
      bottomLeft: 12,
    });

    expect(path).toBe(
      'M 0 0 H 0 A 0 0 0 0 1 0 0 V 0 A 0 0 0 0 1 0 0 H 0 A 0 0 0 0 1 0 0 V 0 A 0 0 0 0 1 0 0 Z'
    );
  });
});

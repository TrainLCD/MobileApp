import type { Line } from '~/@types/graphql';

const mockAssetLoads: string[] = [];

jest.mock('../assets/marks/jre/jy.webp', () => {
  mockAssetLoads.push('jy');
  return 1;
});
jest.mock('../assets/marks/jre/jy_g.webp', () => {
  mockAssetLoads.push('jy_g');
  return 2;
});
jest.mock('../assets/marks/jre/jc.webp', () => {
  mockAssetLoads.push('jc');
  return 3;
});
jest.mock('../assets/marks/jre/co.webp', () => {
  mockAssetLoads.push('co');
  return 4;
});

const line = (id: number) => ({ id }) as Line;

describe('getLineSymbolImage', () => {
  let getLineSymbolImage: typeof import('./lineSymbolImage').getLineSymbolImage;

  beforeEach(() => {
    mockAssetLoads.length = 0;
    jest.isolateModules(() => {
      getLineSymbolImage = require('./lineSymbolImage').getLineSymbolImage;
    });
  });

  it('モジュールを読み込んだだけでは画像アセットを解決しない', () => {
    expect(mockAssetLoads).toEqual([]);
  });

  it('引いた路線の画像だけを解決する', () => {
    expect(getLineSymbolImage(line(11302), false)).toEqual({ signPath: 1 });
    expect(mockAssetLoads).toEqual(['jy']);
  });

  it('グレースケール指定ではカラー版を解決しない', () => {
    expect(getLineSymbolImage(line(11302), true)).toEqual({ signPath: 2 });
    expect(mockAssetLoads).toEqual(['jy_g']);
  });

  it('副記号も解決し、2回目以降は同じオブジェクトを返す', () => {
    const first = getLineSymbolImage(line(11311), false);
    expect(first).toStrictEqual({ signPath: 3, subSignPath: 4 });
    expect(getLineSymbolImage(line(11311), false)).toBe(first);
  });

  it('表に無い路線と id の無い路線は null を返す', () => {
    expect(getLineSymbolImage(line(-1), false)).toBeNull();
    expect(getLineSymbolImage(line(-1), true)).toBeNull();
    expect(getLineSymbolImage({} as Line, false)).toBeNull();
  });
});

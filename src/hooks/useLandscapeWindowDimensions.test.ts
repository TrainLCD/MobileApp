import { getLandscapeWindowDimensions } from './useLandscapeWindowDimensions';

describe('getLandscapeWindowDimensions', () => {
  it('物理画面が縦向きでも横長の寸法と向き判定を返す', () => {
    expect(getLandscapeWindowDimensions(375, 812)).toEqual({
      width: 812,
      height: 375,
      isPortrait: true,
    });
  });

  it('物理画面が横向きの場合は寸法を維持する', () => {
    expect(getLandscapeWindowDimensions(812, 375)).toEqual({
      width: 812,
      height: 375,
      isPortrait: false,
    });
  });
});

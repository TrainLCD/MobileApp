jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

describe.each([false, true])('縦書き駅名の行高 (tablet=%s)', (isTablet) => {
  it.each(['ios', 'android'])('%s の字間とフォント指定を確認する', (os) => {
    jest.isolateModules(() => {
      const { Platform } = require('react-native');
      const platform = jest.replaceProperty(Platform, 'OS', os);
      // Jest は iOS 実装を読むため、OS と select の両方を切り替える。
      const select = jest
        .spyOn(Platform, 'select')
        .mockImplementation((...args) => {
          const spec = args[0] as Record<string, unknown>;
          return os in spec ? spec[os] : spec.default;
        });
      const tablet = jest.replaceProperty(
        require('~/utils/isTablet'),
        'default',
        isTablet
      );
      try {
        const { commonLineBoardStyles: styles } = require('./commonStyles');
        for (const name of [
          'stationName',
          'stationNameWest',
          'stationNameJO',
        ]) {
          const style = styles[name];
          expect(style.fontFamily).toBeUndefined();
          if (os === 'ios') {
            expect(style.lineHeight).toBe(style.fontSize);
            expect(style.marginBottom).toBe(0);
          } else {
            expect(style.lineHeight).toBeUndefined();
            expect(style.marginBottom).toBe(isTablet ? -8 : -6);
            expect(style.includeFontPadding).toBeUndefined();
          }
        }
        // 縦書き用の行高を日本語の斜め書きには適用しない。
        expect(styles.stationNameHorizontal.lineHeight).toBeUndefined();
      } finally {
        select.mockRestore();
        tablet.restore();
        platform.restore();
      }
    });
  });
});

import { render } from '@testing-library/react-native';
import type React from 'react';
import { createMockHeaderProps } from '~/__fixtures__/headerProps';
import { tokyoMetroConfig, tyConfig } from './config';
import HeaderEast from './HeaderEast';

jest.mock('jotai', () => ({
  useAtomValue: jest.fn((atom) => {
    if (atom === require('~/store/atoms/station').default) {
      return { selectedBound: null, arrived: false };
    }
    if (atom === require('~/store/atoms/navigation').default) {
      return { headerState: 'CURRENT' };
    }
    if (atom === require('~/store/atoms/tuning').default) {
      return { headerTransitionDelay: 300 };
    }
    return {};
  }),
}));

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  return {
    ...Reanimated,
    useSharedValue: jest.fn(() => ({ value: 1 })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((value) => value),
    runOnJS: jest.fn((fn) => fn),
    Easing: {
      linear: jest.fn(),
    },
  };
});

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('~/store/atoms/navigation', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('~/store/atoms/station', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('~/store/atoms/tuning', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('~/hooks', () => ({
  useCurrentStation: jest.fn(() => ({
    id: 1,
    name: 'Test Station',
    nameRoman: 'Test Station',
  })),
  useCurrentLine: jest.fn(() => ({
    id: 1,
    name: 'Test Line',
    color: '#FF0000',
  })),
  useNextStation: jest.fn(() => ({
    id: 2,
    name: 'Next Station',
    nameRoman: 'Next Station',
  })),
  useIsNextLastStop: jest.fn(() => false),
  useNumbering: jest.fn(() => [
    { stationNumber: 'M01', lineSymbolShape: 'round' },
    null,
  ]),
  useBoundText: jest.fn(() => ({
    JA: '渋谷方面',
    EN: 'for Shibuya',
    KANA: 'しぶやほうめん',
  })),
  useConnectedLines: jest.fn(() => []),
  useCurrentTrainType: jest.fn(() => null),
  useFirstStop: jest.fn(() => null),
  useHeaderLangState: jest.fn(() => 'JA'),
  useHeaderStateText: jest.fn(() => ({
    stateText: '停車中',
    stateTextRight: '',
  })),
  useHeaderStationText: jest.fn(() => 'Test Station'),
  useLazyPrevious: jest.fn((value) => value),
  usePrevious: jest.fn((value) => value),
  useHeaderAnimation: jest.fn(() => ({
    prevStationText: '',
    prevStateText: '',
    prevStateTextRight: '',
    prevBoundText: '',
    prevConnectionText: '',
    prevIsJapaneseState: true,
    stateTopAnimatedStyles: {},
    stateBottomAnimatedStyles: {},
    stateTopAnimatedStylesRight: {},
    stateBottomAnimatedStylesRight: {},
    topNameAnimatedAnchorStyle: {},
    bottomNameAnimatedAnchorStyle: {},
    topNameAnimatedStyles: {},
    bottomNameAnimatedStyles: {},
    boundTopAnimatedStyles: {},
    boundBottomAnimatedStyles: {},
  })),
}));

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

jest.mock('~/utils/numbering', () => ({
  getNumberingColor: jest.fn(() => '#FF0000'),
}));

jest.mock('~/utils/rfValue', () => ({
  RFValue: jest.fn((value) => value),
}));

jest.mock('../NumberingIcon', () => {
  const { View } = require('react-native');
  return function MockNumberingIcon() {
    return <View testID="NumberingIcon" />;
  };
});

jest.mock('../TrainTypeBox', () => {
  const { View } = require('react-native');
  return function MockTrainTypeBox() {
    return <View testID="TrainTypeBox" />;
  };
});

describe('HeaderEast', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('tokyoMetroConfigでのレンダリング', () => {
    it('クラッシュせずにレンダリングされる', () => {
      expect(() => {
        render(
          <HeaderEast {...createMockHeaderProps()} config={tokyoMetroConfig} />
        );
      }).not.toThrow();
    });

    it('TrainTypeBoxがレンダリングされる', () => {
      const { getByTestId } = render(
        <HeaderEast {...createMockHeaderProps()} config={tokyoMetroConfig} />
      );
      expect(getByTestId('TrainTypeBox')).toBeTruthy();
    });

    it('ナンバリングアイコンが表示される', () => {
      const { useAtomValue } = require('jotai');
      useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === require('~/store/atoms/station').default) {
          return { selectedBound: { id: 1 }, arrived: false };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'CURRENT' };
        }
        if (atom === require('~/store/atoms/tuning').default) {
          return { headerTransitionDelay: 300 };
        }
        return {};
      });

      const { getByTestId } = render(
        <HeaderEast
          {...createMockHeaderProps({
            currentStationNumber: {
              __typename: 'StationNumber',
              stationNumber: 'M01',
              lineSymbolShape: 'ROUND',
              lineSymbol: 'M',
              lineSymbolColor: '#FF0000',
            },
          })}
          config={tokyoMetroConfig}
        />
      );
      expect(getByTestId('NumberingIcon')).toBeTruthy();
    });

    it('ナンバリングアイコンがない場合はレンダリングされない', () => {
      const { queryByTestId } = render(
        <HeaderEast
          {...createMockHeaderProps({ currentStationNumber: undefined })}
          config={tokyoMetroConfig}
        />
      );
      expect(queryByTestId('NumberingIcon')).toBeNull();
    });
  });

  describe('tyConfigでのレンダリング', () => {
    it('クラッシュせずにレンダリングされる', () => {
      expect(() => {
        render(<HeaderEast {...createMockHeaderProps()} config={tyConfig} />);
      }).not.toThrow();
    });

    it('ナンバリングアイコンが表示される（wrappedなし）', () => {
      const { getByTestId } = render(
        <HeaderEast
          {...createMockHeaderProps({
            currentStationNumber: {
              __typename: 'StationNumber',
              stationNumber: 'TY01',
              lineSymbolShape: 'ROUND',
              lineSymbol: 'TY',
              lineSymbolColor: '#FF0000',
            },
          })}
          config={tyConfig}
        />
      );
      expect(getByTestId('NumberingIcon')).toBeTruthy();
    });
  });

  describe('ヘッダー状態ハンドリング', () => {
    for (const headerState of [
      'CURRENT',
      'NEXT',
      'ARRIVING',
      'CURRENT_EN',
      'NEXT_KANA',
    ]) {
      it(`${headerState}状態を処理できる`, () => {
        const { useAtomValue } = require('jotai');
        useAtomValue.mockImplementation((atom: unknown) => {
          if (atom === require('~/store/atoms/station').default) {
            return { selectedBound: { id: 1 }, arrived: false };
          }
          if (atom === require('~/store/atoms/navigation').default) {
            return { headerState };
          }
          if (atom === require('~/store/atoms/tuning').default) {
            return { headerTransitionDelay: 300 };
          }
          return {};
        });

        expect(() => {
          render(
            <HeaderEast
              {...createMockHeaderProps()}
              config={tokyoMetroConfig}
            />
          );
        }).not.toThrow();
      });
    }
  });

  describe('selectedBoundなしのレンダリング', () => {
    it('selectedBoundがnullでもレンダリングできる', () => {
      expect(() => {
        render(
          <HeaderEast
            {...createMockHeaderProps({ selectedBound: null })}
            config={tokyoMetroConfig}
          />
        );
      }).not.toThrow();
    });
  });

  describe('firstStop処理', () => {
    it('firstStop時にクラッシュしない', () => {
      const { useAtomValue } = require('jotai');
      useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === require('~/store/atoms/station').default) {
          return { selectedBound: { id: 1 }, arrived: false };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'CURRENT' };
        }
        if (atom === require('~/store/atoms/tuning').default) {
          return { headerTransitionDelay: 300 };
        }
        return {};
      });

      expect(() => {
        render(
          <HeaderEast
            {...createMockHeaderProps({ firstStop: true })}
            config={tokyoMetroConfig}
          />
        );
      }).not.toThrow();
    });
  });

  describe('カスタムconfigでのレンダリング', () => {
    it('カスタムconfigでクラッシュしない', () => {
      const customConfig = {
        ...tokyoMetroConfig,
        textColor: '#333',
        gradientColors: ['#f0f0f0', '#e0e0e0', '#d0d0d0'] as const,
        gradientLocations: [0, 0.5, 1] as const,
      };

      expect(() => {
        render(
          <HeaderEast {...createMockHeaderProps()} config={customConfig} />
        );
      }).not.toThrow();
    });
  });
});

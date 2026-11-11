import { render } from '@testing-library/react-native';
import { type TrainType, TrainTypeKind } from '~/@types/graphql';
import { createMockHeaderProps } from '~/__fixtures__/headerProps';
import { TOEI_SHINJUKU_LINE_LOCAL } from '~/__fixtures__/line';
import { useHeaderAnimation } from '../hooks';
import * as tabletModule from '../utils/isTablet';
import AnimatedTypography from './AnimatedTypography';
import HeaderJRKyushu from './HeaderJRKyushu';
import TrainTypeBox from './TrainTypeBox';

// Mock dependencies
jest.mock('jotai', () => ({
  ...jest.requireActual('jotai'),
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
  atom: jest.fn((initialValue) => initialValue),
  useAtom: jest.fn((val) => [val, jest.fn()]),
  useSetAtom: jest.fn(() => jest.fn()),
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

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    LinearGradient: (props: Record<string, unknown>) => (
      <View {...props} testID="linear-gradient" />
    ),
  };
});

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

const mockStation = {
  id: 1,
  name: 'Test Station',
  nameRoman: 'Test Station',
  nameKatakana: 'テストステーション',
};

const mockLine = {
  id: 1,
  name: 'Test Line',
  color: '#E50012',
};

const mockNextStation = {
  id: 2,
  name: 'Next Station',
  nameRoman: 'Next Station',
  nameKatakana: 'ネクストステーション',
};

jest.mock('~/hooks', () => ({
  useLandscapeWindowDimensions: jest.fn(() => ({ width: 812, height: 375 })),
  useCurrentStation: jest.fn(() => mockStation),
  useCurrentLine: jest.fn(() => mockLine),
  useNextStation: jest.fn(() => mockNextStation),
  useIsNextLastStop: jest.fn(() => false),
  useNumbering: jest.fn(() => [
    { stationNumber: 'JK01', lineSymbolShape: 'round' },
    null,
  ]),
  useBoundText: jest.fn(() => ({
    JA: '博多方面',
    EN: 'for Hakata',
    KANA: 'はかたほうめん',
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
  get default() {
    return false;
  },
}));

jest.mock('~/utils/numbering', () => ({
  getNumberingColor: jest.fn(() => '#E50012'),
}));

jest.mock('~/utils/rfValue', () => ({
  RFValue: jest.fn((value) => value),
}));

jest.mock('./NumberingIcon', () => {
  const { View } = require('react-native');
  return function MockNumberingIcon() {
    return <View testID="NumberingIcon" />;
  };
});

jest.mock('./TrainTypeBox', () => {
  const { View } = require('react-native');
  return jest.fn(function MockTrainTypeBox() {
    return <View testID="TrainTypeBox" />;
  });
});

jest.mock('./TrainTypeBoxJRKyushu', () => {
  const { View } = require('react-native');
  return function MockTrainTypeBoxJRKyushu() {
    return <View testID="TrainTypeBoxJRKyushu" />;
  };
});

describe('HeaderJRKyushu', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it.each([
    [true, 'EN', 'for Tajimi', 'Bound for Tajimi'],
    [true, 'EN', 'for Tajimi via Kanayama', 'Bound for Tajimi via Kanayama'],
    [true, 'EN', 'Bound for Tajimi', 'Bound for Tajimi'],
    [false, 'EN', 'for Tajimi', 'for Tajimi'],
    [true, 'JA', '多治見 行き', '多治見 行き'],
  ] as const)(
    '315系=%s・言語=%sの行先表示を整形する',
    (is315, headerLangState, boundText, expected) => {
      const props = createMockHeaderProps({
        boundText,
        headerLangState,
        selectedBound: createMockHeaderProps().currentStation,
      });
      const { getByText } = render(<HeaderJRKyushu {...props} is315={is315} />);
      expect(getByText(expected)).toBeTruthy();
      expect(getByText(expected).props.numberOfLines).toBe(
        is315 && headerLangState === 'EN' ? 1 : undefined
      );
      expect(getByText(expected).props.adjustsFontSizeToFit).toBe(
        is315 && headerLangState === 'EN' ? true : undefined
      );
      if (is315 && headerLangState === 'EN') {
        let ancestor = getByText(expected).parent;
        while (ancestor) {
          expect(ancestor.type).not.toBe(AnimatedTypography);
          ancestor = ancestor.parent;
        }
      }
      expect(useHeaderAnimation).toHaveBeenLastCalledWith(
        expect.objectContaining({ boundText: expected })
      );
    }
  );

  it.each([
    [true, 'Bound for Hikarigaoka via Tochomae', true],
    [true, '多治見 行', false],
    [false, 'Bound for Hikarigaoka via Tochomae', false],
  ] as const)(
    '315系=%sの旧行先「%s」も英語だけ1行に収める',
    (is315, previousText, shouldFit) => {
      const mockAnimation = jest.mocked(useHeaderAnimation);
      const implementation = mockAnimation.getMockImplementation();
      if (!implementation) throw new Error('Header animation mock is missing');
      const animation = implementation(createMockHeaderProps());
      mockAnimation.mockReturnValueOnce({
        ...animation,
        prevBoundText: previousText,
      });
      const { getByText } = render(
        <HeaderJRKyushu
          {...createMockHeaderProps({
            boundText: 'たじみ ゆき',
            headerLangState: 'KANA',
            selectedBound: createMockHeaderProps().currentStation,
          })}
          is315={is315}
        />
      );
      if (shouldFit) {
        let ancestor = getByText(previousText).parent;
        while (ancestor) {
          expect(ancestor.type).not.toBe(AnimatedTypography);
          ancestor = ancestor.parent;
        }
      }
      expect(getByText(previousText).props.numberOfLines).toBe(
        shouldFit ? 1 : undefined
      );
      expect(getByText(previousText).props.adjustsFontSizeToFit).toBe(
        shouldFit ? true : undefined
      );
    }
  );

  describe('315系の種別表示と配色', () => {
    it.each([
      [false, 1.3, 1.4],
      [true, 1, 1],
    ])(
      'タブレット=%pで種別表示の寸法倍率を切り替える',
      (isTablet, heightScale, widthScale) => {
        jest.spyOn(tabletModule, 'default', 'get').mockReturnValue(isTablet);
        const { getByTestId, queryByTestId } = render(
          <HeaderJRKyushu {...createMockHeaderProps()} is315 />
        );
        expect(getByTestId('TrainTypeBox')).toBeTruthy();
        expect(jest.mocked(TrainTypeBox).mock.calls.at(-1)?.[0]).toEqual(
          expect.objectContaining({
            darkenColor: true,
            jr315Gradient: true,
            fitTextToHeight: true,
            heightScale,
            widthScale,
            borderRadius: 4,
            borderColor: '#000000',
            colorOverride: '#000000',
          })
        );
        expect(queryByTestId('TrainTypeBoxJRKyushu')).toBeNull();
      }
    );

    it.each([
      TrainTypeKind.Rapid,
      TrainTypeKind.HighSpeedRapid,
      TrainTypeKind.CommuterRapid,
      TrainTypeKind.Default,
      TrainTypeKind.LimitedExpress,
    ])('%sは普通を黒・快速系を青にし、枠も表示色に揃える', (kind) => {
      const trainType: TrainType = {
        __typename: 'TrainType',
        id: 1,
        typeId: 102,
        groupId: 109,
        name: '快速',
        nameKatakana: 'カイソク',
        nameRoman: 'Rapid',
        nameIpa: null,
        nameRomanIpa: null,
        nameTtsSegments: null,
        nameChinese: null,
        nameKorean: null,
        color: '#dc143c',
        direction: null,
        kind,
        line: null,
        lines: null,
      };
      render(
        <HeaderJRKyushu {...createMockHeaderProps({ trainType })} is315 />
      );
      const expected =
        kind === TrainTypeKind.Default
          ? '#000000'
          : kind === TrainTypeKind.Rapid ||
              kind === TrainTypeKind.HighSpeedRapid
            ? '#1e8ad2'
            : '#dc143c';
      const props = jest.mocked(TrainTypeBox).mock.calls.at(-1)?.[0];
      expect(props).toMatchObject({
        colorOverride: expected,
        borderColor: expected,
      });
      expect(props?.trainType).toBe(trainType);
    });

    it('上端は指定の固定色にし、区切り線には現在の路線色を使う', () => {
      const { getAllByTestId, UNSAFE_getAllByType } = render(
        <HeaderJRKyushu
          {...createMockHeaderProps({
            currentLine: { ...TOEI_SHINJUKU_LINE_LOCAL, color: '#0068B7' },
          })}
          is315
        />
      );
      const { View, StyleSheet } = require('react-native');
      expect(getAllByTestId('linear-gradient')[0].props.colors).toEqual([
        '#fff',
        '#FA7D28bb',
        '#FA7D28bb',
        '#FA7D28bb',
        '#fff',
      ]);
      expect(getAllByTestId('linear-gradient')[1].props.colors).toEqual([
        '#fff',
        '#fff',
      ]);
      const views = UNSAFE_getAllByType(View);
      expect(
        StyleSheet.flatten(views[views.length - 1].props.style).backgroundColor
      ).toBe('#0068B7');
    });

    it('路線がなくても上端は指定の固定色を使う', () => {
      const { getAllByTestId } = render(
        <HeaderJRKyushu
          {...createMockHeaderProps({ currentLine: null })}
          is315
        />
      );
      expect(getAllByTestId('linear-gradient')[0].props.colors[1]).toBe(
        '#FA7D28bb'
      );
    });

    it('JR九州風には上端を追加せず赤い区切り線を保つ', () => {
      const { getAllByTestId, UNSAFE_getAllByType } = render(
        <HeaderJRKyushu {...createMockHeaderProps()} />
      );
      const { View, StyleSheet } = require('react-native');
      expect(getAllByTestId('linear-gradient')).toHaveLength(1);
      expect(getAllByTestId('linear-gradient')[0].props.colors).toEqual([
        '#fcfcfc',
        '#ccc',
      ]);
      const views = UNSAFE_getAllByType(View);
      expect(
        StyleSheet.flatten(views[views.length - 1].props.style).backgroundColor
      ).toBe('#E50012');
    });
  });

  describe('Component rendering', () => {
    it('should render without crashing', () => {
      expect(() => {
        render(<HeaderJRKyushu {...createMockHeaderProps()} />);
      }).not.toThrow();
    });

    it('should render TrainTypeBoxJRKyushu', () => {
      const { getByTestId } = render(
        <HeaderJRKyushu {...createMockHeaderProps()} />
      );
      expect(getByTestId('TrainTypeBoxJRKyushu')).toBeTruthy();
    });
  });

  describe('Header state handling', () => {
    it('should handle CURRENT state', () => {
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
        render(<HeaderJRKyushu {...createMockHeaderProps()} />);
      }).not.toThrow();
    });

    it('should handle NEXT state', () => {
      const { useAtomValue } = require('jotai');
      useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === require('~/store/atoms/station').default) {
          return { selectedBound: { id: 1 }, arrived: false };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'NEXT' };
        }
        if (atom === require('~/store/atoms/tuning').default) {
          return { headerTransitionDelay: 300 };
        }
        return {};
      });

      expect(() => {
        render(<HeaderJRKyushu {...createMockHeaderProps()} />);
      }).not.toThrow();
    });

    it('should handle ARRIVING state', () => {
      const { useAtomValue } = require('jotai');
      useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === require('~/store/atoms/station').default) {
          return { selectedBound: { id: 1 }, arrived: false };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'ARRIVING' };
        }
        if (atom === require('~/store/atoms/tuning').default) {
          return { headerTransitionDelay: 300 };
        }
        return {};
      });

      expect(() => {
        render(<HeaderJRKyushu {...createMockHeaderProps()} />);
      }).not.toThrow();
    });

    it('should handle CURRENT_EN state', () => {
      const { useAtomValue } = require('jotai');
      const { useHeaderLangState } = require('~/hooks');
      useHeaderLangState.mockReturnValue('EN');

      useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === require('~/store/atoms/station').default) {
          return { selectedBound: { id: 1 }, arrived: false };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'CURRENT_EN' };
        }
        if (atom === require('~/store/atoms/tuning').default) {
          return { headerTransitionDelay: 300 };
        }
        return {};
      });

      expect(() => {
        render(<HeaderJRKyushu {...createMockHeaderProps()} />);
      }).not.toThrow();
    });

    it('should handle NEXT_KANA state', () => {
      const { useAtomValue } = require('jotai');
      const { useHeaderLangState } = require('~/hooks');
      useHeaderLangState.mockReturnValue('KANA');

      useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === require('~/store/atoms/station').default) {
          return { selectedBound: { id: 1 }, arrived: false };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'NEXT_KANA' };
        }
        if (atom === require('~/store/atoms/tuning').default) {
          return { headerTransitionDelay: 300 };
        }
        return {};
      });

      expect(() => {
        render(<HeaderJRKyushu {...createMockHeaderProps()} />);
      }).not.toThrow();
    });
  });

  describe('Connected lines handling', () => {
    it('should handle connected lines', () => {
      const { useConnectedLines } = require('~/hooks');
      useConnectedLines.mockReturnValue([
        { nameShort: 'Test Line (Test)' },
        { nameShort: 'Another Line' },
      ]);

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
        render(<HeaderJRKyushu {...createMockHeaderProps()} />);
      }).not.toThrow();
    });
  });

  describe('First stop handling', () => {
    it('should handle first stop scenario', () => {
      const { useFirstStop } = require('~/hooks');
      useFirstStop.mockReturnValue({ id: 1, name: 'First Station' });

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
        render(<HeaderJRKyushu {...createMockHeaderProps()} />);
      }).not.toThrow();
    });
  });

  describe('Last stop handling', () => {
    it('should handle last stop scenario', () => {
      const { useIsNextLastStop } = require('~/hooks');
      useIsNextLastStop.mockReturnValue(true);

      const { useAtomValue } = require('jotai');
      useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === require('~/store/atoms/station').default) {
          return { selectedBound: { id: 1 }, arrived: false };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'NEXT' };
        }
        if (atom === require('~/store/atoms/tuning').default) {
          return { headerTransitionDelay: 300 };
        }
        return {};
      });

      expect(() => {
        render(<HeaderJRKyushu {...createMockHeaderProps()} />);
      }).not.toThrow();
    });
  });

  describe('Without selected bound', () => {
    it('should render correctly without selected bound', () => {
      const { useAtomValue } = require('jotai');
      useAtomValue.mockImplementation((atom: unknown) => {
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
      });

      expect(() => {
        render(<HeaderJRKyushu {...createMockHeaderProps()} />);
      }).not.toThrow();
    });
  });

  describe('Numbering icon rendering', () => {
    it('should render numbering icon when station number exists', () => {
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
        <HeaderJRKyushu
          {...createMockHeaderProps({
            currentStationNumber: {
              __typename: 'StationNumber',
              stationNumber: 'JK01',
              lineSymbolShape: 'ROUND',
              lineSymbol: 'JK',
              lineSymbolColor: '#E50012',
            },
          })}
        />
      );
      expect(getByTestId('NumberingIcon')).toBeTruthy();
    });

    it('should not render numbering icon when station number is missing', () => {
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

      const { queryByTestId } = render(
        <HeaderJRKyushu
          {...createMockHeaderProps({ currentStationNumber: undefined })}
        />
      );
      expect(queryByTestId('NumberingIcon')).toBeNull();
    });
  });
});

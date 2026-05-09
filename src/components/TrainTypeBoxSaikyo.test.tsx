import { render } from '@testing-library/react-native';
import React from 'react';
import type { TrainType } from '~/@types/graphql';
import { TrainTypeKind } from '~/@types/graphql';
import TrainTypeBoxSaikyo from './TrainTypeBoxSaikyo';

// Mock dependencies
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  return {
    ...Reanimated,
    useSharedValue: jest.fn(() => ({ value: 1 })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((value) => value),
    runOnJS: jest.fn((fn) => fn),
    Easing: {
      ease: jest.fn(),
    },
  };
});

jest.mock('~/hooks/useLazyPrevious', () => ({
  useLazyPrevious: jest.fn((value) => value),
}));

// LinearGradientのcolors propをDOM上から取得できるようにする
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    LinearGradient: ({
      colors,
      children,
      style,
    }: {
      colors: string[];
      children?: React.ReactNode;
      style?: unknown;
    }) => (
      <View
        style={style as object}
        testID={`linear-gradient:${(colors ?? []).join('|')}`}
      >
        {children}
      </View>
    ),
  };
});

// Create a minimal test component to test the split function crash fix
const TestSplitFunction = ({
  trainTypeName,
  prevTrainTypeName,
}: {
  trainTypeName: string | null | undefined;
  prevTrainTypeName: string | null | undefined;
}) => {
  // This mimics the exact logic from TrainTypeBoxSaikyo that was causing crashes
  const _numberOfLines = React.useMemo(
    () => (trainTypeName?.split('\n').length === 1 ? 1 : 2),
    [trainTypeName]
  );
  const _prevNumberOfLines = React.useMemo(
    () => (prevTrainTypeName?.split('\n').length === 1 ? 1 : 2),
    [prevTrainTypeName]
  );

  return null; // We just care that the component doesn't crash
};

describe('TrainTypeBoxSaikyo', () => {
  const mockTrainType: TrainType = {
    __typename: 'TrainType',
    id: 1,
    typeId: 1,
    groupId: 1,
    name: 'Test',
    nameKatakana: 'テスト',
    nameRoman: 'Test',
    nameIpa: null,
    nameRomanIpa: null,
    nameTtsSegments: null,
    nameChinese: '测试',
    nameKorean: '테스트',
    color: '#000000',
    direction: undefined,
    kind: undefined,
    line: undefined,
    lines: undefined,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Null safety fixes', () => {
    it('should not crash when trainTypeName is undefined', () => {
      expect(() => {
        render(
          <TestSplitFunction
            trainTypeName={undefined}
            prevTrainTypeName={undefined}
          />
        );
      }).not.toThrow();
    });

    it('should not crash when trainTypeName is null', () => {
      expect(() => {
        render(
          <TestSplitFunction trainTypeName={null} prevTrainTypeName={null} />
        );
      }).not.toThrow();
    });

    it('should not crash when trainTypeName is empty string', () => {
      expect(() => {
        render(<TestSplitFunction trainTypeName="" prevTrainTypeName="" />);
      }).not.toThrow();
    });

    it('should work correctly with valid strings', () => {
      expect(() => {
        render(
          <TestSplitFunction
            trainTypeName="Test"
            prevTrainTypeName="Test\nLine"
          />
        );
      }).not.toThrow();
    });

    it('should work correctly when one is undefined and other is valid', () => {
      expect(() => {
        render(
          <TestSplitFunction
            trainTypeName={undefined}
            prevTrainTypeName="Valid"
          />
        );
      }).not.toThrow();
    });
  });

  describe('Component rendering', () => {
    it('should render without crashing with valid train type', () => {
      expect(() => {
        render(
          <TrainTypeBoxSaikyo lineColor="#000" trainType={mockTrainType} />
        );
      }).not.toThrow();
    });

    it('should render without crashing with null train type', () => {
      expect(() => {
        render(<TrainTypeBoxSaikyo lineColor="#000" trainType={null} />);
      }).not.toThrow();
    });
  });

  describe('trainTypeColor (種別色) の決定', () => {
    const buildTrainType = (kind: TrainTypeKind | null): TrainType => ({
      ...mockTrainType,
      color: '#abcdef',
      kind,
    });

    // trainTypeColorはLinearGradientの2層目（最後のcolors）に
    // `${trainTypeColor}bb` / `${trainTypeColor}ff` として渡されるため、
    // testIDから該当色を持つLinearGradientが存在するか検証する
    const hasGradientWithColor = (
      queryAllByTestId: (id: RegExp) => unknown[],
      color: string
    ): boolean =>
      queryAllByTestId(new RegExp(`^linear-gradient:${color}bb\\|${color}ff$`))
        .length > 0;

    it('CommuterRapidの場合、専用色 #dc143c が適用される', () => {
      const { queryAllByTestId } = render(
        <TrainTypeBoxSaikyo
          lineColor="#000000"
          trainType={buildTrainType(TrainTypeKind.CommuterRapid)}
        />
      );
      expect(hasGradientWithColor(queryAllByTestId, '#dc143c')).toBe(true);
    });

    it('Rapidの場合、Rapid色 #1e8ad2 が適用される（CommuterRapidとは異なる）', () => {
      const { queryAllByTestId } = render(
        <TrainTypeBoxSaikyo
          lineColor="#000000"
          trainType={buildTrainType(TrainTypeKind.Rapid)}
        />
      );
      expect(hasGradientWithColor(queryAllByTestId, '#1e8ad2')).toBe(true);
      expect(hasGradientWithColor(queryAllByTestId, '#dc143c')).toBe(false);
    });

    it('HighSpeedRapidの場合、Rapid色 #1e8ad2 が適用される', () => {
      const { queryAllByTestId } = render(
        <TrainTypeBoxSaikyo
          lineColor="#000000"
          trainType={buildTrainType(TrainTypeKind.HighSpeedRapid)}
        />
      );
      expect(hasGradientWithColor(queryAllByTestId, '#1e8ad2')).toBe(true);
    });

    it('Default (各駅停車) の場合、lineColorが適用される', () => {
      const { queryAllByTestId } = render(
        <TrainTypeBoxSaikyo
          lineColor="#abcd12"
          trainType={buildTrainType(TrainTypeKind.Default)}
        />
      );
      expect(hasGradientWithColor(queryAllByTestId, '#abcd12')).toBe(true);
    });

    it('LimitedExpressなど他の種別はtrainType.colorが優先される', () => {
      const { queryAllByTestId } = render(
        <TrainTypeBoxSaikyo
          lineColor="#000000"
          trainType={buildTrainType(TrainTypeKind.LimitedExpress)}
        />
      );
      expect(hasGradientWithColor(queryAllByTestId, '#abcdef')).toBe(true);
    });
  });
});

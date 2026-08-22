import { render } from '@testing-library/react-native';
import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import type { TrainType } from '~/@types/graphql';
import TrainTypeBoxJRKyushu from './TrainTypeBoxJRKyushu';

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

// Create a minimal test component to test the split function crash fix
const TestSplitFunction = ({
  trainTypeName,
  prevTrainTypeName,
}: {
  trainTypeName: string | null | undefined;
  prevTrainTypeName: string | null | undefined;
}) => {
  // This mimics the exact logic from TrainTypeBoxJRKyushu that was causing crashes
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

describe('TrainTypeBoxJRKyushu', () => {
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
        render(<TrainTypeBoxJRKyushu trainType={mockTrainType} />);
      }).not.toThrow();
    });

    it('should render without crashing with null train type', () => {
      expect(() => {
        render(<TrainTypeBoxJRKyushu trainType={null} />);
      }).not.toThrow();
    });
  });

  describe('種別箱のレイアウト', () => {
    const twoLineTrainType: TrainType = {
      ...mockTrainType,
      name: '特急\nゆふいんの森',
      nameRoman: 'Limited Express\nYufuin no Mori',
    };

    // 寸法を持つViewはboxとtextWrapperの2つだけ。
    const collectSizedViewStyles = (root: ReturnType<typeof render>) =>
      root
        .UNSAFE_getAllByType(View)
        .map((view) => StyleSheet.flatten(view.props.style))
        .filter(
          (style): style is { width: number; height: number } =>
            typeof style?.width === 'number' &&
            typeof style?.height === 'number'
        );

    // textWrapperにbox(128x35)より小さい旧内寸(96.25x30.25)が残っていると、
    // 種別名が箱からはみ出して潰れる。両者が同じ内寸であることを固定する。
    it('textWrapperの内寸がboxと一致する', () => {
      const sizes = collectSizedViewStyles(
        render(<TrainTypeBoxJRKyushu trainType={mockTrainType} />)
      );

      expect(sizes).toHaveLength(2);
      expect(sizes[1].width).toBe(sizes[0].width);
      expect(sizes[1].height).toBe(sizes[0].height);
    });

    it('2行種別の行送り2行分が箱の高さに収まる', () => {
      const view = render(
        <TrainTypeBoxJRKyushu trainType={twoLineTrainType} />
      );
      const boxHeight = collectSizedViewStyles(view)[0].height;
      // クロスフェードの新旧2層とも2行レイアウトで描画される。
      const labels = view
        .UNSAFE_getAllByType(Animated.Text)
        .filter((label) => label.props.numberOfLines === 2);

      expect(labels.length).toBeGreaterThan(0);
      for (const label of labels) {
        const { lineHeight } = StyleSheet.flatten(label.props.style) as {
          lineHeight: number;
        };
        expect(lineHeight * 2).toBeLessThanOrEqual(boxHeight);
      }
    });
  });
});

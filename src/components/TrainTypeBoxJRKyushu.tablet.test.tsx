import { render } from '@testing-library/react-native';
import { Animated, StyleSheet, View } from 'react-native';
import type { TrainType } from '~/@types/graphql';
import TrainTypeBoxJRKyushu from './TrainTypeBoxJRKyushu';

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

// styles は module ロード時に確定するため、タブレット寸法は別ファイルで検証する。
jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: true,
}));

describe('TrainTypeBoxJRKyushu - tablet', () => {
  const TABLET_BOX_WIDTH = 175;
  const TABLET_BOX_HEIGHT = 55;

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

  const twoLineTrainType: TrainType = {
    ...mockTrainType,
    name: '特急\nゆふいんの森',
    nameRoman: 'Limited Express\nYufuin no Mori',
  };

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  // 寸法を持つViewはboxとtextWrapperの2つだけ。
  const collectSizedViewStyles = (root: ReturnType<typeof render>) =>
    root
      .UNSAFE_getAllByType(View)
      .map((view) => StyleSheet.flatten(view.props.style))
      .filter(
        (style): style is { width: number; height: number } =>
          typeof style?.width === 'number' && typeof style?.height === 'number'
      );

  it('textWrapperの内寸がタブレット時のboxと一致する', () => {
    const sizes = collectSizedViewStyles(
      render(<TrainTypeBoxJRKyushu trainType={mockTrainType} />)
    );

    expect(sizes).toHaveLength(2);
    for (const size of sizes) {
      expect(size.width).toBe(TABLET_BOX_WIDTH);
      expect(size.height).toBe(TABLET_BOX_HEIGHT);
    }
  });

  it('2行種別の行送り2行分がタブレット時の箱の高さに収まる', () => {
    const view = render(<TrainTypeBoxJRKyushu trainType={twoLineTrainType} />);
    // クロスフェードの新旧2層とも2行レイアウトで描画される。
    const labels = view
      .UNSAFE_getAllByType(Animated.Text)
      .filter((label) => label.props.numberOfLines === 2);

    expect(labels.length).toBeGreaterThan(0);
    for (const label of labels) {
      const { lineHeight } = StyleSheet.flatten(label.props.style) as {
        lineHeight: number;
      };
      expect(lineHeight * 2).toBeLessThanOrEqual(TABLET_BOX_HEIGHT);
    }
  });
});

import { render } from '@testing-library/react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAtomValue } from 'jotai';
import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import type { TrainType } from '~/@types/graphql';
import { FONTS } from '../constants';
import { APP_THEME } from '../models/Theme';
import { headerStateAtom } from '../store/atoms/navigation';
import { themeAtom } from '../store/atoms/theme';
import tuningState from '../store/atoms/tuning';
import AnimatedTypography from './AnimatedTypography';
import TrainTypeBox, { resolveTrainTypeFontFamily } from './TrainTypeBox';
import TrainTypeBox315Gradient from './TrainTypeBox315Gradient';

jest.mock('jotai', () => ({
  ...jest.requireActual('jotai'),
  useAtomValue: jest.fn(),
}));

jest.mock('../hooks', () => ({
  useCurrentLine: jest.fn(() => null),
  useLandscapeWindowDimensions: jest.fn(() => ({ width: 800, height: 400 })),
  useLazyPrevious: jest.requireActual('../hooks/useLazyPrevious')
    .useLazyPrevious,
  useNextTrainType: jest.fn(() => null),
  usePrevious: jest.requireActual('../hooks/usePrevious').usePrevious,
}));

jest.mock('../translation', () => ({
  translate: jest.fn((key) => key),
}));

// Create a minimal component that tests the specific crash fix
const TestSplitFunction = ({
  trainTypeName,
  prevTrainTypeName,
}: {
  trainTypeName: string | null | undefined;
  prevTrainTypeName: string | null | undefined;
}) => {
  // This mimics the exact logic from TrainTypeBox that was causing crashes
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

// Test component that mimics the infinite loop fix
const TestInfiniteLoopFix = ({
  trainTypeName,
}: {
  trainTypeName: string | null | undefined;
}) => {
  const [fadeOutFinished, setFadeOutFinished] = React.useState(false);
  const [renderCount, setRenderCount] = React.useState(0);

  // Mock useLazyPrevious behavior
  const [prevTrainTypeName, setPrevTrainTypeName] =
    React.useState(trainTypeName);
  React.useEffect(() => {
    if (fadeOutFinished && prevTrainTypeName !== trainTypeName) {
      setPrevTrainTypeName(trainTypeName);
    }
  }, [fadeOutFinished, prevTrainTypeName, trainTypeName]);

  // Test the fixed useEffect logic
  React.useEffect(() => {
    setRenderCount((prev) => prev + 1);

    // Fixed logic: only setFadeOutFinished(false) when there's an actual change
    if (prevTrainTypeName !== trainTypeName) {
      setFadeOutFinished(false);
      // Simulate animation completion
      setTimeout(() => setFadeOutFinished(true), 10);
    }
  }, [prevTrainTypeName, trainTypeName]);

  // Prevent infinite loops in tests
  if (renderCount > 10) {
    throw new Error('Infinite loop detected');
  }

  return null;
};

describe('TrainTypeBox crash fix', () => {
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

  it('should not cause infinite loops when values change', () => {
    expect(() => {
      render(<TestInfiniteLoopFix trainTypeName="Test" />);
    }).not.toThrow();
  });

  it('should not cause infinite loops when values stay the same', () => {
    expect(() => {
      render(<TestInfiniteLoopFix trainTypeName="Test" />);
      // Render again with same value
      render(<TestInfiniteLoopFix trainTypeName="Test" />);
    }).not.toThrow();
  });
});

describe('TrainTypeBox font family', () => {
  it('韓国語ではハングル対応のOSフォントへフォールバックする', () => {
    expect(resolveTrainTypeFontFamily(APP_THEME.TOKYO_METRO, 'KO')).toBe(
      undefined
    );
  });

  it('韓国語以外では通常テーマ用フォントを維持する', () => {
    expect(resolveTrainTypeFontFamily(APP_THEME.TOKYO_METRO, 'JA')).toBe(
      FONTS.RobotoBold
    );
  });

  it('LEDテーマでは韓国語以外にドットフォントを使用する', () => {
    expect(resolveTrainTypeFontFamily(APP_THEME.LED, 'JA')).toBe(
      FONTS.JFDotJiskan24h
    );
  });

  it('LEDテーマでも韓国語はOSフォントへフォールバックする', () => {
    expect(resolveTrainTypeFontFamily(APP_THEME.LED, 'KO')).toBeUndefined();
  });
});

describe('TrainTypeBox 2行種別の可読性', () => {
  const BOX_HEIGHT = 30.25;
  // TrainTypeBox の MINIMUM_FONT_SCALE と揃える。可読性を保てない値
  // (0.01 など) へ緩められた場合に検知できるよう実値で固定する。
  const MINIMUM_FONT_SCALE = 0.5;

  const twoLineTrainType: TrainType = {
    __typename: 'TrainType',
    id: 1,
    typeId: 1,
    groupId: 1,
    name: '通勤特急\n(狭山線直通)',
    nameKatakana: 'ツウキントッキュウ',
    nameRoman: 'Commuter\nLimited Express',
    nameIpa: null,
    nameRomanIpa: null,
    nameTtsSegments: null,
    nameChinese: '通勤特快',
    nameKorean: '통근특급',
    color: '#f00',
    direction: null,
    kind: null,
    line: null,
    lines: null,
  };

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  const renderWithScale = (
    fontSizeScale: number,
    heightScale = 1,
    widthScale = 1,
    borderRadius?: number,
    gradientProps: {
      darkenColor?: boolean;
      jr315Gradient?: boolean;
      borderColor?: string;
      fitTextToHeight?: boolean;
      colorOverride?: string;
    } = {}
  ) => {
    (useAtomValue as jest.Mock).mockImplementation((atom: unknown) => {
      if (atom === headerStateAtom) return 'CURRENT_JA';
      if (atom === themeAtom) return APP_THEME.TOKYO_METRO;
      if (atom === tuningState) return { headerTransitionDelay: 1000 };
      return undefined;
    });
    jest
      .spyOn(Animated, 'timing')
      .mockImplementation(() => ({ start: jest.fn() }) as never);

    return render(
      <TrainTypeBox
        trainType={twoLineTrainType}
        fontSizeScale={fontSizeScale}
        heightScale={heightScale}
        widthScale={widthScale}
        borderRadius={borderRadius}
        {...gradientProps}
      />
    );
  };

  // 小田急テーマは fontSizeScale 1.2 を渡す。クランプがないと 2 行分の行送りが
  // 箱の高さ(30.25)を超え、adjustsFontSizeToFit が高さ制約を満たせずに
  // グリフを潰してしまい種別名が消えたように見える。
  it.each([1, 1.2])(
    'fontSizeScale=%p でも2行分の行送りが箱の高さに収まる',
    (fontSizeScale) => {
      // マウント直後はクロスフェードの新旧2層が同じ種別名を描画するため、
      // 両方の行送りが箱に収まっていることを確認する。
      const { getAllByText } = renderWithScale(fontSizeScale);
      const labels = getAllByText('通勤特急\n');

      expect(labels.length).toBeGreaterThan(0);
      for (const label of labels) {
        const style = StyleSheet.flatten(label.props.style) as {
          lineHeight: number;
        };
        expect(style.lineHeight * 2).toBeLessThanOrEqual(BOX_HEIGHT);
      }
    }
  );

  it.each([
    [1, 1],
    [1.3, 1.4],
  ])(
    '高さ倍率=%p・幅倍率=%pで箱と文字領域の内寸を揃える',
    (heightScale, widthScale) => {
      const { UNSAFE_root, getAllByText } = renderWithScale(
        1.2,
        heightScale,
        widthScale
      );
      const height = BOX_HEIGHT * heightScale;
      const boxes = UNSAFE_root.findAllByType(View)
        .map((node) => StyleSheet.flatten(node.props.style))
        .filter(
          (style) =>
            style?.width === 96.25 * widthScale && style?.height != null
        );
      expect(boxes.length).toBeGreaterThanOrEqual(2);
      for (const box of boxes) {
        expect(box.height).toBe(height);
      }
      for (const label of getAllByText('通勤特急\n')) {
        expect(
          StyleSheet.flatten(label.props.style).lineHeight * 2
        ).toBeLessThanOrEqual(height);
      }
    }
  );

  it.each([undefined, 8])(
    '角丸=%pを全グラデーション層へ反映する',
    (borderRadius) => {
      const { UNSAFE_root } = renderWithScale(1.2, 1, 1, borderRadius);
      const layers = UNSAFE_root.findAllByType(LinearGradient);
      expect(layers).toHaveLength(2);
      for (const layer of layers) {
        expect(StyleSheet.flatten(layer.props.style).borderRadius).toBe(
          borderRadius ?? 4
        );
      }
    }
  );

  it.each([false, true])(
    'jr315Gradient=%pの段階位置を確認する',
    (jr315Gradient) => {
      const { UNSAFE_root } = renderWithScale(1.2, 1.3, 1.4, 8, {
        darkenColor: true,
        jr315Gradient,
      });
      const layers = UNSAFE_root.findAllByType(LinearGradient);
      expect(layers).toHaveLength(jr315Gradient ? 1 : 4);
      if (jr315Gradient) {
        expect(layers[0].props.locations).toEqual([0, 0.35, 0.62, 1]);
      } else {
        expect(layers[0].props.colors).toEqual([
          '#aaa',
          '#000',
          '#000',
          '#aaa',
        ]);
        expect(layers[0].props.locations).toEqual([0.35, 0.35, 0.35, 0.9]);
        expect(layers[3].props.locations).toEqual([0, 0.35, 0.35]);
      }
    }
  );

  it.each([undefined, '#1e8ad2'])(
    '色上書き=%pを315系のグラデーションに反映する',
    (colorOverride) => {
      const { UNSAFE_root } = renderWithScale(1, 1.3, 1.4, 8, {
        jr315Gradient: true,
        colorOverride,
      });
      expect(
        UNSAFE_root.findByType(TrainTypeBox315Gradient).props.trainTypeColor
      ).toBe(colorOverride ?? '#f00');
    }
  );

  it('黒い普通でも上部・中央下・下端の明暗を残す', () => {
    const { UNSAFE_root } = render(
      <TrainTypeBox315Gradient trainTypeColor="#000000" style={{}} />
    );
    const gradient = UNSAFE_root.findByType(LinearGradient);
    expect(gradient.props.colors).toEqual([
      '#4f4f4f',
      '#282828',
      '#181818',
      '#2b2b2b',
    ]);
    expect(gradient.props.locations).toEqual([0, 0.35, 0.62, 1]);
  });

  it.each([undefined, '#F47921'])(
    '枠色=%pをグラデーションとは別に描く',
    (borderColor) => {
      const { UNSAFE_root } = renderWithScale(1.2, 1.3, 1.4, 8, {
        jr315Gradient: true,
        borderColor,
      });
      const outlines = UNSAFE_root.findAllByType(View).filter(
        (node) => StyleSheet.flatten(node.props.style)?.borderWidth === 1
      );
      expect(outlines).toHaveLength(borderColor ? 1 : 0);
      if (borderColor) {
        expect(StyleSheet.flatten(outlines[0].props.style)).toMatchObject({
          position: 'absolute',
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          borderWidth: 1,
          borderRadius: 8,
          borderColor,
        });
        expect(outlines[0].props.pointerEvents).toBe('none');
      }
    }
  );

  it('315系では上下に余白を残し、2行表示と切り替え前の文字も箱に収める', () => {
    const innerHeight = (BOX_HEIGHT * 1.3 - 2) * 0.675;
    const { getAllByText, getByText, rerender } = renderWithScale(
      1,
      1.3,
      1.4,
      8,
      {
        fitTextToHeight: true,
      }
    );
    for (const label of getAllByText('通勤特急\n')) {
      expect(StyleSheet.flatten(label.props.style).lineHeight * 2).toBeCloseTo(
        innerHeight
      );
    }
    rerender(
      <TrainTypeBox
        trainType={{ ...twoLineTrainType, name: '快速' }}
        heightScale={1.3}
        widthScale={1.4}
        fitTextToHeight
      />
    );
    const style = StyleSheet.flatten(getByText('快速').props.style);
    expect(style.fontSize).toBeCloseTo(innerHeight);
    expect(style.lineHeight).toBeCloseTo(innerHeight);
  });

  it('adjustsFontSizeToFitの縮小下限を指定してグリフの消失を防ぐ', () => {
    const { UNSAFE_root } = renderWithScale(1.2);
    const texts = UNSAFE_root.findAllByType(AnimatedTypography);

    expect(texts.length).toBeGreaterThan(0);
    for (const text of texts) {
      expect(text.props.adjustsFontSizeToFit).toBe(true);
      expect(text.props.minimumFontScale).toBe(MINIMUM_FONT_SCALE);
    }
  });
});

describe('TrainTypeBox language transition', () => {
  const trainType: TrainType = {
    __typename: 'TrainType',
    id: 1,
    typeId: 1,
    groupId: 1,
    name: '快速',
    nameKatakana: 'カイソク',
    nameRoman: 'Rapid',
    nameIpa: null,
    nameRomanIpa: null,
    nameTtsSegments: null,
    nameChinese: '快速',
    nameKorean: '쾌속',
    color: '#f00',
    direction: null,
    kind: null,
    line: null,
    lines: null,
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each(['慢车', '区间\n快车'])(
    '315系の中国語「%s」は自然な行高を使い、フェード中も維持する',
    (nameChinese) => {
      let headerState = 'CURRENT_ZH';
      (useAtomValue as jest.Mock).mockImplementation((atom: unknown) => {
        if (atom === headerStateAtom) return headerState;
        if (atom === themeAtom) return APP_THEME.JR_315;
        if (atom === tuningState) return { headerTransitionDelay: 1000 };
        return undefined;
      });
      jest
        .spyOn(Animated, 'timing')
        .mockImplementation(() => ({ start: jest.fn() }) as never);
      const type = { ...trainType, nameChinese };
      const { getByText, getAllByText, rerender } = render(
        <TrainTypeBox
          trainType={type}
          fitTextToHeight
          heightScale={1.3}
          widthScale={1.4}
        />
      );
      const current = StyleSheet.flatten(
        getAllByText(nameChinese)[0].props.style
      );
      expect(current.lineHeight).toBeUndefined();
      expect(current.fontSize).toBeGreaterThan(0);
      headerState = 'CURRENT_JA';
      rerender(
        <TrainTypeBox
          trainType={{ ...type }}
          fitTextToHeight
          heightScale={1.3}
          widthScale={1.4}
        />
      );
      const previous = StyleSheet.flatten(getByText(nameChinese).props.style);
      const japanese = StyleSheet.flatten(getByText('快速').props.style);
      expect(previous.lineHeight).toBeUndefined();
      expect(previous.fontSize).toBe(current.fontSize);
      expect(japanese.lineHeight).toBe(japanese.fontSize);
    }
  );

  it('KOからJAへのフェード中は旧ハングルにOSフォント設定を維持する', () => {
    let headerState = 'CURRENT_KO';
    (useAtomValue as jest.Mock).mockImplementation((atom: unknown) => {
      if (atom === headerStateAtom) return headerState;
      if (atom === themeAtom) return APP_THEME.TOKYO_METRO;
      if (atom === tuningState) return { headerTransitionDelay: 1000 };
      return undefined;
    });
    jest
      .spyOn(Animated, 'timing')
      .mockImplementation(() => ({ start: jest.fn() }) as never);

    const { getByText, rerender } = render(
      <TrainTypeBox trainType={trainType} />
    );
    headerState = 'CURRENT_JA';
    rerender(<TrainTypeBox trainType={{ ...trainType }} />);

    const previousKoreanStyle = StyleSheet.flatten(
      getByText('쾌속').props.style
    );
    const currentJapaneseStyle = StyleSheet.flatten(
      getByText('快速').props.style
    );

    expect(previousKoreanStyle.fontFamily).toBeUndefined();
    expect(previousKoreanStyle.fontWeight).toBe('bold');
    expect(currentJapaneseStyle.fontFamily).toBe(FONTS.RobotoBold);
  });
});

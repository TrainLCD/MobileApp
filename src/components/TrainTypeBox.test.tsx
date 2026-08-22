import { render } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import React from 'react';
import { Animated, StyleSheet } from 'react-native';
import type { TrainType } from '~/@types/graphql';
import { FONTS } from '../constants';
import { APP_THEME } from '../models/Theme';
import { headerStateAtom } from '../store/atoms/navigation';
import { themeAtom } from '../store/atoms/theme';
import tuningState from '../store/atoms/tuning';
import TrainTypeBox, { resolveTrainTypeFontFamily } from './TrainTypeBox';

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

  const renderWithScale = (fontSizeScale: number) => {
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

  it('adjustsFontSizeToFitの縮小下限を指定してグリフの消失を防ぐ', () => {
    const { UNSAFE_root } = renderWithScale(1.2);
    const texts = UNSAFE_root.findAllByType(Animated.Text);

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

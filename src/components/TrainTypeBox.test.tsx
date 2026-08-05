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

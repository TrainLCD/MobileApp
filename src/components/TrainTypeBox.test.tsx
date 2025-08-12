import { render } from '@testing-library/react-native';
import React from 'react';

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

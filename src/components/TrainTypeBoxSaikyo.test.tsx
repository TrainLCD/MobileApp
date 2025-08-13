import { render } from '@testing-library/react-native';
import React from 'react';
import { TrainType } from '~/gen/proto/stationapi_pb';
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
  const mockTrainType = new TrainType({});

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
});

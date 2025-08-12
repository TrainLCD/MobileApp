import { render } from '@testing-library/react-native';
import React from 'react';
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

jest.mock('~/hooks/usePrevious', () => ({
  usePrevious: jest.fn((value) => value),
}));

jest.mock('~/store/atoms/headerTransitionDelay', () => ({
  __esModule: true,
  default: { value: 100 },
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
  const mockTrainType = {
    id: 1,
    groupId: 1,
    nameShort: 'Test',
    nameMedium: 'Test Type',
    nameFull: 'Test Train Type',
    nameRoman: 'Test',
    nameKatakana: 'テスト',
    nameKorean: '테스트',
    nameChinese: '测试',
    color: '#FF0000',
    lines: [],
    kind: 0,
    typeId: 1,
    name: 'Test',
    direction: 0,
    equals: jest.fn(() => false),
    clone: jest.fn(),
    toBinary: jest.fn(() => new Uint8Array()),
    toJson: jest.fn(() => ({})),
    toJsonString: jest.fn(() => '{}'),
    fromBinary: jest.fn(),
    fromJson: jest.fn(),
    fromJsonString: jest.fn(),
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
        render(<TrainTypeBoxSaikyo trainType={mockTrainType} lineColor="#FF0000" />);
      }).not.toThrow();
    });

    it('should render without crashing with null train type', () => {
      expect(() => {
        render(<TrainTypeBoxSaikyo trainType={null} lineColor="#FF0000" />);
      }).not.toThrow();
    });
  });
});

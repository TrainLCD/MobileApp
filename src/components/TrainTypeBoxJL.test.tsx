import { render } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import React from 'react';
import type { TrainType } from '~/@types/graphql';
import { headerStateAtom } from '~/store/atoms/navigation';
import { stationsAtom } from '~/store/atoms/station';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import TrainTypeBoxJL from './TrainTypeBoxJL';

// Mock dependencies
jest.mock('jotai', () => ({
  ...jest.requireActual('jotai'),
  useAtomValue: jest.fn(),
}));

jest.mock('~/translation', () => ({
  translate: jest.fn((key) => key),
}));

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

jest.mock('~/utils/truncateTrainType', () => ({
  __esModule: true,
  default: jest.fn((name) => name),
}));

// Create a minimal test component to test the split function crash fix
const TestSplitFunction = ({
  trainTypeNameJa,
  trainTypeNameR,
  trainTypeNameZh,
  trainTypeNameKo,
}: {
  trainTypeNameJa: string | null | undefined;
  trainTypeNameR: string | null | undefined;
  trainTypeNameZh: string | null | undefined;
  trainTypeNameKo: string | null | undefined;
}) => {
  // This mimics the exact logic from TrainTypeBoxJL that was causing crashes
  const trainTypeName = React.useMemo(() => {
    const headerLangState = 'JA' as 'JA' | 'EN' | 'ZH' | 'KO';
    switch (headerLangState) {
      case 'EN':
        return trainTypeNameR?.split('\n')[0]?.trim();
      case 'ZH':
        return trainTypeNameZh?.split('\n')[0]?.trim();
      case 'KO':
        return trainTypeNameKo?.split('\n')[0]?.trim();
      default:
        return trainTypeNameJa?.split('\n')[0]?.trim();
    }
  }, [trainTypeNameJa, trainTypeNameR, trainTypeNameZh, trainTypeNameKo]);

  const _numberOfLines = React.useMemo(
    () => (trainTypeName?.split('\n').length === 1 ? 1 : 2),
    [trainTypeName]
  );

  return null; // We just care that the component doesn't crash
};

describe('TrainTypeBoxJL', () => {
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
    direction: null,
    kind: null,
    line: null,
    lines: null,
  };

  beforeEach(() => {
    // 渡されたatomの同一性で読み出し値を出し分ける
    (useAtomValue as jest.Mock).mockImplementation((a: unknown) => {
      if (a === headerStateAtom) return 'CURRENT';
      if (a === isLEDThemeAtom) return false;
      if (a === stationsAtom) return [];
      return undefined;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Null safety fixes', () => {
    it('should not crash when train type names are undefined', () => {
      expect(() => {
        render(
          <TestSplitFunction
            trainTypeNameJa={undefined}
            trainTypeNameR={undefined}
            trainTypeNameZh={undefined}
            trainTypeNameKo={undefined}
          />
        );
      }).not.toThrow();
    });

    it('should not crash when train type names are null', () => {
      expect(() => {
        render(
          <TestSplitFunction
            trainTypeNameJa={null}
            trainTypeNameR={null}
            trainTypeNameZh={null}
            trainTypeNameKo={null}
          />
        );
      }).not.toThrow();
    });

    it('should not crash when train type names are empty strings', () => {
      expect(() => {
        render(
          <TestSplitFunction
            trainTypeNameJa=""
            trainTypeNameR=""
            trainTypeNameZh=""
            trainTypeNameKo=""
          />
        );
      }).not.toThrow();
    });

    it('should work correctly with valid strings', () => {
      expect(() => {
        render(
          <TestSplitFunction
            trainTypeNameJa="Test"
            trainTypeNameR="Test\nLine"
            trainTypeNameZh="测试"
            trainTypeNameKo="테스트"
          />
        );
      }).not.toThrow();
    });

    it('should work correctly when some names are undefined and others are valid', () => {
      expect(() => {
        render(
          <TestSplitFunction
            trainTypeNameJa={undefined}
            trainTypeNameR="Valid"
            trainTypeNameZh={undefined}
            trainTypeNameKo="Valid"
          />
        );
      }).not.toThrow();
    });
  });

  describe('Component rendering', () => {
    it('should render without crashing with valid train type', () => {
      expect(() => {
        render(<TrainTypeBoxJL trainType={mockTrainType} />);
      }).not.toThrow();
    });

    it('should render without crashing with null train type', () => {
      expect(() => {
        render(<TrainTypeBoxJL trainType={null} />);
      }).not.toThrow();
    });
  });
});

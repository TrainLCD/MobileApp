import { render } from '@testing-library/react-native';
import type React from 'react';
import { TrainTypeKind } from '~/@types/graphql';
import { createMockHeaderProps } from '~/__fixtures__/headerProps';
import HeaderJRWest from './HeaderJRWest';

// Mock dependencies
jest.mock('jotai', () => ({
  useAtomValue: jest.fn((atom) => {
    if (atom === require('~/store/atoms/station').default) {
      return { selectedBound: null, arrived: false };
    }
    if (atom === require('~/store/atoms/navigation').default) {
      return { headerState: 'CURRENT' };
    }
    return {};
  }),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('expo-image', () => ({
  Image: () => null,
}));

jest.mock('~/store/atoms/navigation', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('~/store/atoms/station', () => ({
  __esModule: true,
  default: {},
}));

const mockStation = {
  id: 1,
  name: 'Test Station',
  nameRoman: 'Test Station',
  nameKatakana: 'テストステーション',
};

const mockLine = {
  id: 1,
  name: 'Test Line',
  color: '#FF0000',
  lineType: 'Normal',
};

const mockNextStation = {
  id: 2,
  name: 'Next Station',
  nameRoman: 'Next Station',
  nameKatakana: 'ネクストステーション',
  nameChinese: '下一站',
  nameKorean: '다음역',
};

jest.mock('~/hooks', () => ({
  useCurrentStation: jest.fn(() => mockStation),
  useCurrentLine: jest.fn(() => mockLine),
  useNextStation: jest.fn(() => mockNextStation),
  useIsNextLastStop: jest.fn(() => false),
  useNumbering: jest.fn(() => [
    { stationNumber: 'JR-A01', lineSymbolShape: 'round' },
    null,
  ]),
  useBoundText: jest.fn(() => ({
    JA: '大阪方面',
    EN: 'for Osaka',
    KANA: 'おおさかほうめん',
    ZH: '大阪方向',
    KO: '오사카 방면',
  })),
  useCurrentTrainType: jest.fn(() => null),
  useGetLineMark: jest.fn(() => jest.fn(() => null)),
}));

jest.mock('~/translation', () => ({
  translate: jest.fn((key) => {
    const translations: Record<string, string> = {
      nowStoppingAt: '停車中',
      soon: 'まもなく',
      soonLast: 'まもなく終点',
      soonEn: 'Arriving at',
      soonEnLast: 'Arriving at terminal',
      soonKanaLast: 'まもなくしゅうてん',
      soonZh: '即将到达',
      soonZhLast: '即将到达终点',
      soonKo: '곧 도착',
      soonKoLast: '곧 종점 도착',
      next: '次は',
      nextLast: '次は終点',
      nextEn: 'Next',
      nextEnLast: 'Next terminal',
      nextKana: 'つぎは',
      nextKanaLast: 'つぎはしゅうてん',
      nextZh: '下一站',
      nextZhLast: '下一站终点',
      nextKo: '다음역',
      nextKoLast: '다음역 종점',
    };
    return translations[key] || key;
  }),
}));

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

jest.mock('~/utils/kanaToHiragana', () => ({
  __esModule: true,
  default: jest.fn((str) => str),
}));

jest.mock('~/utils/numbering', () => ({
  getNumberingColor: jest.fn(() => '#FF0000'),
}));

jest.mock('~/utils/rfValue', () => ({
  RFValue: jest.fn((value) => value),
}));

jest.mock('./NumberingIcon', () => {
  const { View } = require('react-native');
  return function MockNumberingIcon() {
    return <View testID="NumberingIcon" />;
  };
});

jest.mock('./TransferLineMark', () => {
  const { View } = require('react-native');
  return function MockTransferLineMark() {
    return <View testID="TransferLineMark" />;
  };
});

jest.mock('./Typography', () => {
  const { Text } = require('react-native');
  return function MockTypography({
    children,
    style,
  }: {
    children: React.ReactNode;
    style?: unknown;
  }) {
    return <Text style={style}>{children}</Text>;
  };
});

describe('HeaderJRWest', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component rendering', () => {
    it('should render without crashing', () => {
      expect(() => {
        render(<HeaderJRWest {...createMockHeaderProps()} />);
      }).not.toThrow();
    });
  });

  describe('Header state handling', () => {
    it('should handle CURRENT state', () => {
      const { useAtomValue } = require('jotai');
      useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === require('~/store/atoms/station').default) {
          return { selectedBound: { id: 1 }, arrived: false };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'CURRENT' };
        }
        return {};
      });

      expect(() => {
        render(<HeaderJRWest {...createMockHeaderProps()} />);
      }).not.toThrow();
    });

    it('should handle NEXT state', () => {
      const { useAtomValue } = require('jotai');
      useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === require('~/store/atoms/station').default) {
          return { selectedBound: { id: 1 }, arrived: false };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'NEXT' };
        }
        return {};
      });

      expect(() => {
        render(<HeaderJRWest {...createMockHeaderProps()} />);
      }).not.toThrow();
    });

    it('should handle ARRIVING state', () => {
      const { useAtomValue } = require('jotai');
      useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === require('~/store/atoms/station').default) {
          return { selectedBound: { id: 1 }, arrived: false };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'ARRIVING' };
        }
        return {};
      });

      expect(() => {
        render(<HeaderJRWest {...createMockHeaderProps()} />);
      }).not.toThrow();
    });

    it('should handle CURRENT_EN state', () => {
      const { useAtomValue } = require('jotai');
      useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === require('~/store/atoms/station').default) {
          return { selectedBound: { id: 1 }, arrived: false };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'CURRENT_EN' };
        }
        return {};
      });

      expect(() => {
        render(<HeaderJRWest {...createMockHeaderProps()} />);
      }).not.toThrow();
    });

    it('should handle ARRIVING_KANA state', () => {
      const { useAtomValue } = require('jotai');
      useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === require('~/store/atoms/station').default) {
          return { selectedBound: { id: 1 }, arrived: false };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'ARRIVING_KANA' };
        }
        return {};
      });

      expect(() => {
        render(<HeaderJRWest {...createMockHeaderProps()} />);
      }).not.toThrow();
    });

    it('should handle CURRENT_ZH state', () => {
      const { useAtomValue } = require('jotai');
      const { useCurrentStation } = require('~/hooks');
      useCurrentStation.mockReturnValue({
        ...mockStation,
        nameChinese: '测试站',
      });

      useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === require('~/store/atoms/station').default) {
          return { selectedBound: { id: 1 }, arrived: false };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'CURRENT_ZH' };
        }
        return {};
      });

      expect(() => {
        render(<HeaderJRWest {...createMockHeaderProps()} />);
      }).not.toThrow();
    });

    it('should handle CURRENT_KO state', () => {
      const { useAtomValue } = require('jotai');
      const { useCurrentStation } = require('~/hooks');
      useCurrentStation.mockReturnValue({
        ...mockStation,
        nameKorean: '테스트역',
      });

      useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === require('~/store/atoms/station').default) {
          return { selectedBound: { id: 1 }, arrived: false };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'CURRENT_KO' };
        }
        return {};
      });

      expect(() => {
        render(<HeaderJRWest {...createMockHeaderProps()} />);
      }).not.toThrow();
    });

    it('should handle ARRIVING_ZH state', () => {
      const { useAtomValue } = require('jotai');
      useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === require('~/store/atoms/station').default) {
          return { selectedBound: { id: 1 }, arrived: false };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'ARRIVING_ZH' };
        }
        return {};
      });

      expect(() => {
        render(<HeaderJRWest {...createMockHeaderProps()} />);
      }).not.toThrow();
    });

    it('should handle ARRIVING_KO state', () => {
      const { useAtomValue } = require('jotai');
      useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === require('~/store/atoms/station').default) {
          return { selectedBound: { id: 1 }, arrived: false };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'ARRIVING_KO' };
        }
        return {};
      });

      expect(() => {
        render(<HeaderJRWest {...createMockHeaderProps()} />);
      }).not.toThrow();
    });

    it('should handle NEXT_ZH state', () => {
      const { useAtomValue } = require('jotai');
      useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === require('~/store/atoms/station').default) {
          return { selectedBound: { id: 1 }, arrived: false };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'NEXT_ZH' };
        }
        return {};
      });

      expect(() => {
        render(<HeaderJRWest {...createMockHeaderProps()} />);
      }).not.toThrow();
    });

    it('should handle NEXT_KO state', () => {
      const { useAtomValue } = require('jotai');
      useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === require('~/store/atoms/station').default) {
          return { selectedBound: { id: 1 }, arrived: false };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'NEXT_KO' };
        }
        return {};
      });

      expect(() => {
        render(<HeaderJRWest {...createMockHeaderProps()} />);
      }).not.toThrow();
    });
  });

  describe('Train type handling', () => {
    it('should handle rapid train type', () => {
      const { useCurrentTrainType } = require('~/hooks');
      useCurrentTrainType.mockReturnValue({
        name: '快速',
        kind: TrainTypeKind.Rapid,
      });

      expect(() => {
        render(<HeaderJRWest {...createMockHeaderProps()} />);
      }).not.toThrow();
    });

    it('should handle express train type', () => {
      const { useCurrentTrainType } = require('~/hooks');
      useCurrentTrainType.mockReturnValue({
        name: '急行',
        kind: TrainTypeKind.Express,
      });

      expect(() => {
        render(<HeaderJRWest {...createMockHeaderProps()} />);
      }).not.toThrow();
    });

    it('should handle limited express train type', () => {
      const { useCurrentTrainType } = require('~/hooks');
      useCurrentTrainType.mockReturnValue({
        name: '特急',
        kind: TrainTypeKind.LimitedExpress,
      });

      expect(() => {
        render(<HeaderJRWest {...createMockHeaderProps()} />);
      }).not.toThrow();
    });

    it('should handle special rapid train type', () => {
      const { useCurrentTrainType } = require('~/hooks');
      useCurrentTrainType.mockReturnValue({
        name: '新快速',
        kind: TrainTypeKind.HighSpeedRapid,
      });

      expect(() => {
        render(<HeaderJRWest {...createMockHeaderProps()} />);
      }).not.toThrow();
    });

    it('should handle regional rapid train type', () => {
      const { useCurrentTrainType } = require('~/hooks');
      useCurrentTrainType.mockReturnValue({
        name: '区間快速',
        kind: TrainTypeKind.Rapid,
      });

      expect(() => {
        render(<HeaderJRWest {...createMockHeaderProps()} />);
      }).not.toThrow();
    });

    it('should handle Kansai Airport rapid train type', () => {
      const { useCurrentTrainType } = require('~/hooks');
      useCurrentTrainType.mockReturnValue({
        name: '関空快速',
        kind: TrainTypeKind.Rapid,
      });

      expect(() => {
        render(<HeaderJRWest {...createMockHeaderProps()} />);
      }).not.toThrow();
    });

    it('should handle Kishuji rapid train type', () => {
      const { useCurrentTrainType } = require('~/hooks');
      useCurrentTrainType.mockReturnValue({
        name: '紀州路快速',
        kind: TrainTypeKind.Rapid,
      });

      expect(() => {
        render(<HeaderJRWest {...createMockHeaderProps()} />);
      }).not.toThrow();
    });

    it('should handle Miyakoji rapid train type', () => {
      const { useCurrentTrainType } = require('~/hooks');
      useCurrentTrainType.mockReturnValue({
        name: 'みやこ路快速',
        kind: TrainTypeKind.Rapid,
      });

      expect(() => {
        render(<HeaderJRWest {...createMockHeaderProps()} />);
      }).not.toThrow();
    });

    it('should handle Yamatoji rapid train type', () => {
      const { useCurrentTrainType } = require('~/hooks');
      useCurrentTrainType.mockReturnValue({
        name: '大和路快速',
        kind: TrainTypeKind.Rapid,
      });

      expect(() => {
        render(<HeaderJRWest {...createMockHeaderProps()} />);
      }).not.toThrow();
    });

    it('should handle Tanbaji rapid train type', () => {
      const { useCurrentTrainType } = require('~/hooks');
      useCurrentTrainType.mockReturnValue({
        name: '丹波路快速',
        kind: TrainTypeKind.Rapid,
      });

      expect(() => {
        render(<HeaderJRWest {...createMockHeaderProps()} />);
      }).not.toThrow();
    });
  });

  describe('Last stop handling', () => {
    it('should handle last stop scenario', () => {
      const { useIsNextLastStop } = require('~/hooks');
      useIsNextLastStop.mockReturnValue(true);

      const { useAtomValue } = require('jotai');
      useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === require('~/store/atoms/station').default) {
          return { selectedBound: { id: 1 }, arrived: false };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'NEXT' };
        }
        return {};
      });

      expect(() => {
        render(<HeaderJRWest {...createMockHeaderProps()} />);
      }).not.toThrow();
    });
  });

  describe('Line mark handling', () => {
    it('should render with line mark', () => {
      const { useGetLineMark } = require('~/hooks');
      useGetLineMark.mockReturnValue(() => ({
        sign: 'A',
        signPath: '/path/to/sign',
        subSign: null,
      }));

      const { useAtomValue } = require('jotai');
      useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === require('~/store/atoms/station').default) {
          return { selectedBound: { id: 1 }, arrived: false };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'CURRENT' };
        }
        return {};
      });

      const { getByTestId } = render(
        <HeaderJRWest {...createMockHeaderProps()} />
      );
      expect(getByTestId('TransferLineMark')).toBeTruthy();
    });
  });

  describe('Without selected bound', () => {
    it('should render correctly without selected bound', () => {
      const { useAtomValue } = require('jotai');
      useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === require('~/store/atoms/station').default) {
          return { selectedBound: null, arrived: false };
        }
        if (atom === require('~/store/atoms/navigation').default) {
          return { headerState: 'CURRENT' };
        }
        return {};
      });

      expect(() => {
        render(<HeaderJRWest {...createMockHeaderProps()} />);
      }).not.toThrow();
    });
  });
});

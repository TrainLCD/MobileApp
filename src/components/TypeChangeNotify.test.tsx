import { render } from '@testing-library/react-native';
import type React from 'react';
import TypeChangeNotify from './TypeChangeNotify';

jest.mock('jotai', () => ({
  useAtomValue: jest.fn((atom) => {
    if (atom === require('../store/atoms/station').default) {
      return {
        selectedDirection: 'INBOUND',
        stations: [],
        selectedBound: null,
      };
    }
    if (atom === require('../store/atoms/theme').themeAtom) {
      return 'TOKYO_METRO';
    }
    return {};
  }),
  atom: jest.fn((initialValue) => initialValue),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('~/hooks', () => ({
  useCurrentLine: jest.fn(() => ({
    id: 1,
    nameShort: 'テスト線',
    nameRoman: 'Test Line',
    color: '#FF0000',
    company: { id: 1, nameShort: 'テスト', nameEnglishShort: 'Test' },
  })),
  useCurrentStation: jest.fn(() => ({
    id: 1,
    groupId: 1,
    name: 'テスト駅',
    nameRoman: 'Test Station',
  })),
  useCurrentTrainType: jest.fn(() => null),
  useNextTrainType: jest.fn(() => null),
}));

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

jest.mock('~/utils/rfValue', () => ({
  RFValue: jest.fn((value) => value),
}));

jest.mock('~/utils/trainTypeString', () => ({
  getIsLocal: jest.fn(() => false),
}));

jest.mock('~/utils/truncateTrainType', () => ({
  __esModule: true,
  default: jest.fn((value) => value),
}));

jest.mock('../store/atoms/station', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('../store/atoms/theme', () => ({
  themeAtom: {},
}));

jest.mock('./BarTerminalEast', () => ({
  BarTerminalEast: jest.fn(() => null),
}));

jest.mock('./BarTerminalSaikyo', () => ({
  BarTerminalSaikyo: jest.fn(() => null),
}));

jest.mock('./Typography', () => {
  const { Text } = require('react-native');
  return function MockTypography({ children }: { children: React.ReactNode }) {
    return <Text>{children}</Text>;
  };
});

describe('TypeChangeNotify', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('クラッシュせずにレンダリングされる', () => {
    expect(() => {
      render(<TypeChangeNotify />);
    }).not.toThrow();
  });

  it('trainTypeがnullの場合でもクラッシュしない', () => {
    const { useCurrentTrainType, useNextTrainType } = require('~/hooks');
    useCurrentTrainType.mockReturnValue(null);
    useNextTrainType.mockReturnValue(null);

    expect(() => {
      render(<TypeChangeNotify />);
    }).not.toThrow();
  });

  it('SAIKYOテーマでクラッシュしない', () => {
    const { useAtomValue } = require('jotai');
    useAtomValue.mockImplementation((atom: unknown) => {
      if (atom === require('../store/atoms/station').default) {
        return {
          selectedDirection: 'INBOUND',
          stations: [],
          selectedBound: null,
        };
      }
      if (atom === require('../store/atoms/theme').themeAtom) {
        return 'SAIKYO';
      }
      return {};
    });

    expect(() => {
      render(<TypeChangeNotify />);
    }).not.toThrow();
  });

  it('JOテーマでクラッシュしない', () => {
    const { useAtomValue } = require('jotai');
    useAtomValue.mockImplementation((atom: unknown) => {
      if (atom === require('../store/atoms/station').default) {
        return {
          selectedDirection: 'INBOUND',
          stations: [],
          selectedBound: null,
        };
      }
      if (atom === require('../store/atoms/theme').themeAtom) {
        return 'JO';
      }
      return {};
    });

    expect(() => {
      render(<TypeChangeNotify />);
    }).not.toThrow();
  });
});

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

jest.mock('./BarTerminalOdakyu', () => ({
  BarTerminalOdakyu: jest.fn(() => null),
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

  it('ODAKYUテーマでクラッシュしない', () => {
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
        return 'ODAKYU';
      }
      return {};
    });

    expect(() => {
      render(<TypeChangeNotify />);
    }).not.toThrow();
  });

  it('直通運転時に中間路線名が正しく表示される（小田急多摩線→千代田線→常磐線）', () => {
    const { useAtomValue } = require('jotai');
    const {
      useCurrentLine,
      useCurrentStation,
      useCurrentTrainType,
      useNextTrainType,
    } = require('~/hooks');

    const odakyuTamaLine = {
      id: 100,
      nameShort: '小田急多摩線',
      nameRoman: 'Odakyu Tama Line',
      color: '#0D82C7',
    };

    const chiyodaLine = {
      id: 200,
      nameShort: '千代田線',
      nameRoman: 'Chiyoda Line',
      color: '#009944',
    };

    const jobanLine = {
      id: 300,
      nameShort: '常磐線',
      nameRoman: 'Joban Line',
      color: '#00B264',
    };

    // 直通運転時、station.lineは全て選択路線(小田急多摩線)になるが、
    // station.linesには実際の路線が含まれる
    const stations = [
      {
        id: 1,
        groupId: 1,
        name: '新百合ヶ丘',
        nameRoman: 'Shin-Yurigaoka',
        line: odakyuTamaLine,
        lines: [odakyuTamaLine],
        trainType: { typeId: 1, name: '急行', nameRoman: 'Express' },
        stopCondition: 'STOP',
      },
      {
        id: 2,
        groupId: 2,
        name: '代々木上原',
        nameRoman: 'Yoyogi-Uehara',
        line: odakyuTamaLine,
        lines: [odakyuTamaLine, chiyodaLine],
        trainType: { typeId: 2, name: '準急', nameRoman: 'Semi Express' },
        stopCondition: 'STOP',
      },
      {
        id: 3,
        groupId: 3,
        name: '表参道',
        nameRoman: 'Omote-sando',
        line: odakyuTamaLine,
        lines: [chiyodaLine],
        trainType: { typeId: 2, name: '準急', nameRoman: 'Semi Express' },
        stopCondition: 'STOP',
      },
      {
        id: 4,
        groupId: 4,
        name: '綾瀬',
        nameRoman: 'Ayase',
        line: odakyuTamaLine,
        lines: [chiyodaLine, jobanLine],
        trainType: { typeId: 2, name: '準急', nameRoman: 'Semi Express' },
        stopCondition: 'STOP',
      },
      {
        id: 5,
        groupId: 4,
        name: '綾瀬',
        nameRoman: 'Ayase',
        line: jobanLine,
        lines: [chiyodaLine, jobanLine],
        trainType: { typeId: 3, name: '各停', nameRoman: 'Local' },
        stopCondition: 'STOP',
      },
      {
        id: 6,
        groupId: 5,
        name: '取手',
        nameRoman: 'Toride',
        line: jobanLine,
        lines: [jobanLine],
        trainType: { typeId: 3, name: '各停', nameRoman: 'Local' },
        stopCondition: 'STOP',
      },
    ];

    useCurrentLine.mockReturnValue(odakyuTamaLine);
    useCurrentStation.mockReturnValue(stations[3]);
    useCurrentTrainType.mockReturnValue({
      typeId: 2,
      name: '準急',
      nameRoman: 'Semi Express',
      color: '#009944',
      line: odakyuTamaLine,
      lines: [odakyuTamaLine, chiyodaLine],
    });
    useNextTrainType.mockReturnValue({
      typeId: 3,
      name: '各停',
      nameRoman: 'Local',
      color: '#00B264',
      line: jobanLine,
    });

    useAtomValue.mockImplementation((atom: unknown) => {
      if (atom === require('../store/atoms/station').default) {
        return {
          selectedDirection: 'INBOUND',
          stations,
          selectedBound: { name: '取手', nameRoman: 'Toride' },
        };
      }
      if (atom === require('../store/atoms/theme').themeAtom) {
        return 'TOKYO_METRO';
      }
      return {};
    });

    const { queryAllByText } = render(<TypeChangeNotify />);

    // 左側のバーの路線名が千代田線（中間路線）であること
    // 小田急多摩線（選択路線）ではないこと
    const chiyodaTexts = queryAllByText(/千代田線/);
    expect(chiyodaTexts.length).toBeGreaterThan(0);

    const odakyuTexts = queryAllByText(/小田急多摩線/);
    expect(odakyuTexts).toHaveLength(0);
  });
});

import { render } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { enabledLanguagesAtom } from '../store/atoms/navigation';
import {
  selectedBoundAtom,
  selectedDirectionAtom,
  stationsAtom,
} from '../store/atoms/station';
import { themeAtom } from '../store/atoms/theme';
import TypeChangeNotify from './TypeChangeNotify';

jest.mock('jotai', () => ({
  ...jest.requireActual('jotai'),
  useAtomValue: jest.fn(),
}));

// 渡されたatomの同一性で読み出し値を出し分ける
const mockAtomValues = ({
  selectedDirection = 'INBOUND',
  stations = [] as unknown[],
  selectedBound = null as unknown,
  theme = 'TOKYO_METRO',
  enabledLanguages = ['JA', 'EN', 'ZH', 'KO'] as string[],
} = {}) => {
  (useAtomValue as jest.Mock).mockImplementation((atom: unknown) => {
    if (atom === selectedDirectionAtom) return selectedDirection;
    if (atom === stationsAtom) return stations;
    if (atom === selectedBoundAtom) return selectedBound;
    if (atom === themeAtom) return theme;
    if (atom === enabledLanguagesAtom) return enabledLanguages;
    return {};
  });
};

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({
      children,
      edges,
      ...props
    }: {
      children: React.ReactNode;
      edges?: readonly string[];
      [key: string]: unknown;
    }) =>
      React.createElement(
        View,
        {
          ...props,
          testID: 'safe-area-view',
          accessibilityLabel: edges?.join(',') ?? 'all',
        },
        children
      ),
  };
});

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('~/hooks', () => ({
  useLandscapeWindowDimensions: jest.fn(() => ({ width: 812, height: 375 })),
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
  beforeEach(() => {
    mockAtomValues();
    const { useLandscapeWindowDimensions } = require('~/hooks');
    useLandscapeWindowDimensions.mockReturnValue({
      width: 812,
      height: 375,
      isPortrait: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('クラッシュせずにレンダリングされる', () => {
    expect(() => {
      render(<TypeChangeNotify />);
    }).not.toThrow();
  });

  it('物理画面が縦向きの場合は上下のセーフエリアを適用しない', () => {
    const { useLandscapeWindowDimensions } = require('~/hooks');
    useLandscapeWindowDimensions.mockReturnValue({
      width: 812,
      height: 375,
      isPortrait: true,
    });

    const { getByTestId } = render(<TypeChangeNotify />);

    expect(getByTestId('safe-area-view')).toHaveProp(
      'accessibilityLabel',
      'left,right'
    );
  });

  it('物理画面が横向きの場合は全方向のセーフエリアを適用する', () => {
    const { getByTestId } = render(<TypeChangeNotify />);

    expect(getByTestId('safe-area-view')).toHaveProp(
      'accessibilityLabel',
      'all'
    );
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
    mockAtomValues({ theme: 'SAIKYO' });

    expect(() => {
      render(<TypeChangeNotify />);
    }).not.toThrow();
  });

  it('JOテーマでクラッシュしない', () => {
    mockAtomValues({ theme: 'JO' });

    expect(() => {
      render(<TypeChangeNotify />);
    }).not.toThrow();
  });

  it('ODAKYUテーマでクラッシュしない', () => {
    mockAtomValues({ theme: 'ODAKYU' });

    expect(() => {
      render(<TypeChangeNotify />);
    }).not.toThrow();
  });

  it('直通運転時に中間路線名が正しく表示される（小田急多摩線→千代田線→常磐線）', () => {
    const {
      useCurrentLine,
      useCurrentStation,
      useCurrentTrainType,
      useNextTrainType,
    } = require('~/hooks');

    const odakyuCompany = { id: 1, nameShort: '小田急' };
    const metroCompany = { id: 2, nameShort: '東京メトロ' };
    const jrEastCompany = { id: 3, nameShort: 'JR東日本' };

    const odakyuTamaLine = {
      id: 100,
      nameShort: '小田急多摩線',
      nameRoman: 'Odakyu Tama Line',
      color: '#0D82C7',
      company: odakyuCompany,
    };

    const chiyodaLine = {
      id: 200,
      nameShort: '千代田線',
      nameRoman: 'Chiyoda Line',
      color: '#009944',
      company: metroCompany,
    };

    const jobanLine = {
      id: 300,
      nameShort: '常磐線',
      nameRoman: 'Joban Line',
      color: '#00B264',
      company: jrEastCompany,
    };

    // 直通運転時、station.lineは各駅の所属路線が設定される
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
        line: chiyodaLine,
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
    useCurrentStation.mockReturnValue(stations[0]);
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

    mockAtomValues({
      stations,
      selectedBound: { name: '取手', nameRoman: 'Toride' },
    });

    const { queryAllByText } = render(<TypeChangeNotify />);

    // 左側のバーの路線名が千代田線（中間路線）であること
    // 小田急多摩線（選択路線）ではないこと
    const chiyodaTexts = queryAllByText(/千代田線/);
    expect(chiyodaTexts.length).toBeGreaterThan(0);

    const odakyuTexts = queryAllByText(/小田急多摩線/);
    expect(odakyuTexts).toHaveLength(0);
  });

  describe('enabledLanguages による表示切替', () => {
    const setupLanguageScenario = (enabledLanguages: string[]) => {
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
      const jobanLine = {
        id: 300,
        nameShort: '常磐線',
        nameRoman: 'Joban Line',
        color: '#00B264',
      };
      const stations = [
        {
          id: 1,
          groupId: 1,
          name: '新百合ヶ丘',
          nameRoman: 'Shin-Yurigaoka',
          line: odakyuTamaLine,
          lines: [odakyuTamaLine],
          trainType: { typeId: 2, name: '準急', nameRoman: 'Semi Express' },
          stopCondition: 'STOP',
        },
        {
          id: 2,
          groupId: 2,
          name: '綾瀬',
          nameRoman: 'Ayase',
          line: jobanLine,
          lines: [jobanLine],
          trainType: { typeId: 3, name: '各停', nameRoman: 'Local' },
          stopCondition: 'STOP',
        },
      ];

      useCurrentLine.mockReturnValue(odakyuTamaLine);
      useCurrentStation.mockReturnValue(stations[0]);
      useCurrentTrainType.mockReturnValue({
        typeId: 2,
        name: '準急',
        nameRoman: 'Semi Express',
        color: '#009944',
        line: odakyuTamaLine,
      });
      useNextTrainType.mockReturnValue({
        typeId: 3,
        name: '各停',
        nameRoman: 'Local',
        color: '#00B264',
        line: jobanLine,
      });

      mockAtomValues({
        stations,
        selectedBound: { name: '取手', nameRoman: 'Toride' },
        enabledLanguages,
      });
    };

    it('JAのみ有効時は日本語ラベルだけが表示される', () => {
      setupLanguageScenario(['JA']);
      const { queryAllByText } = render(<TypeChangeNotify />);

      expect(queryAllByText(/準急/).length).toBeGreaterThan(0);
      expect(queryAllByText(/各停/).length).toBeGreaterThan(0);
      expect(queryAllByText(/Semi Express/)).toHaveLength(0);
      expect(queryAllByText(/Local/)).toHaveLength(0);
    });

    it('ENのみ有効時は英語ラベルだけが表示される', () => {
      setupLanguageScenario(['EN']);
      const { queryAllByText } = render(<TypeChangeNotify />);

      expect(queryAllByText(/Semi Express/).length).toBeGreaterThan(0);
      expect(queryAllByText(/Local/).length).toBeGreaterThan(0);
      expect(queryAllByText(/準急/)).toHaveLength(0);
      expect(queryAllByText(/各停/)).toHaveLength(0);
    });

    it('JAとEN両方有効時は両言語のラベルが共存する', () => {
      setupLanguageScenario(['JA', 'EN']);
      const { queryAllByText } = render(<TypeChangeNotify />);

      expect(queryAllByText(/準急/).length).toBeGreaterThan(0);
      expect(queryAllByText(/各停/).length).toBeGreaterThan(0);
      expect(queryAllByText(/Semi Express/).length).toBeGreaterThan(0);
      expect(queryAllByText(/Local/).length).toBeGreaterThan(0);
    });
  });
});

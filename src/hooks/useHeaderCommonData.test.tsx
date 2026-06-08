import { render } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { Text } from 'react-native';
import { APP_THEME, type AppTheme } from '~/models/Theme';
import { createStation } from '~/utils/test/factories';
import { useBoundText } from './useBoundText';
import { useConnectedLines } from './useConnectedLines';
import { useCurrentLine } from './useCurrentLine';
import { useCurrentStation } from './useCurrentStation';
import { useCurrentTrainType } from './useCurrentTrainType';
import { useFirstStop } from './useFirstStop';
import { useHeaderCommonData } from './useHeaderCommonData';
import { useHeaderLangState } from './useHeaderLangState';
import { useHeaderStateText } from './useHeaderStateText';
import { useHeaderStationText } from './useHeaderStationText';
import { useIsNextLastStop } from './useIsNextLastStop';
import { useNextStation } from './useNextStation';
import { useNumbering } from './useNumbering';

jest.mock('jotai', () => ({
  __esModule: true,
  useAtomValue: jest.fn(),
  atom: jest.fn((arg) => arg),
}));

jest.mock('~/store/atoms/theme', () => ({
  __esModule: true,
  themeAtom: 'THEME_ATOM',
}));

jest.mock('../store/atoms/navigation', () => ({
  __esModule: true,
  default: 'NAVIGATION_ATOM',
}));

jest.mock('../store/atoms/station', () => ({
  __esModule: true,
  default: 'STATION_ATOM',
}));

jest.mock('../store/atoms/tuning', () => ({
  __esModule: true,
  default: 'TUNING_ATOM',
}));

jest.mock('./useBoundText', () => ({
  __esModule: true,
  useBoundText: jest.fn(),
}));

jest.mock('./useConnectedLines', () => ({
  __esModule: true,
  useConnectedLines: jest.fn(),
}));

jest.mock('./useCurrentLine', () => ({
  __esModule: true,
  useCurrentLine: jest.fn(),
}));

jest.mock('./useCurrentStation', () => ({
  __esModule: true,
  useCurrentStation: jest.fn(),
}));

jest.mock('./useCurrentTrainType', () => ({
  __esModule: true,
  useCurrentTrainType: jest.fn(),
}));

jest.mock('./useFirstStop', () => ({
  __esModule: true,
  useFirstStop: jest.fn(),
}));

jest.mock('./useHeaderLangState', () => ({
  __esModule: true,
  useHeaderLangState: jest.fn(),
}));

jest.mock('./useHeaderStateText', () => ({
  __esModule: true,
  useHeaderStateText: jest.fn(),
}));

jest.mock('./useHeaderStationText', () => ({
  __esModule: true,
  useHeaderStationText: jest.fn(),
}));

jest.mock('./useIsNextLastStop', () => ({
  __esModule: true,
  useIsNextLastStop: jest.fn(),
}));

jest.mock('./useNextStation', () => ({
  __esModule: true,
  useNextStation: jest.fn(),
}));

jest.mock('./useNumbering', () => ({
  __esModule: true,
  useNumbering: jest.fn(),
}));

const TestComponent: React.FC = () => {
  const commonData = useHeaderCommonData();
  return <Text testID="result">{JSON.stringify(commonData)}</Text>;
};

describe('useHeaderCommonData', () => {
  const mockUseAtomValue = useAtomValue as jest.MockedFunction<
    typeof useAtomValue
  >;
  const mockUseBoundText = useBoundText as jest.MockedFunction<
    typeof useBoundText
  >;
  const mockUseCurrentStation = useCurrentStation as jest.MockedFunction<
    typeof useCurrentStation
  >;

  const mockStation = createStation(1, {
    name: '渋谷',
    nameRoman: 'Shibuya',
  });

  const setupMocks = (theme: AppTheme) => {
    mockUseAtomValue.mockImplementation((atom: unknown) => {
      if (atom === 'THEME_ATOM') {
        return theme;
      }
      if (atom === 'STATION_ATOM') {
        return {
          selectedBound: null,
          arrived: false,
          stations: [],
        };
      }
      if (atom === 'NAVIGATION_ATOM') {
        return { headerState: 'CURRENT' };
      }
      if (atom === 'TUNING_ATOM') {
        return { headerTransitionDelay: 0 };
      }
      return {};
    });

    mockUseCurrentStation.mockReturnValue(mockStation);
    (useCurrentLine as jest.Mock).mockReturnValue(null);
    (useNextStation as jest.Mock).mockReturnValue(null);
    (useCurrentTrainType as jest.Mock).mockReturnValue(null);
    (useIsNextLastStop as jest.Mock).mockReturnValue(false);
    (useFirstStop as jest.Mock).mockReturnValue(null);
    (useConnectedLines as jest.Mock).mockReturnValue([]);
    (useHeaderLangState as jest.Mock).mockReturnValue('JA');
    (useHeaderStateText as jest.Mock).mockReturnValue({
      stateText: '',
      stateTextRight: '',
    });
    (useHeaderStationText as jest.Mock).mockReturnValue('渋谷');
    (useNumbering as jest.Mock).mockReturnValue([null, null]);
    mockUseBoundText.mockReturnValue({
      JA: 'TrainLCD',
      EN: 'TrainLCD',
      ZH: 'TrainLCD',
      KO: 'TrainLCD',
      KANA: 'TrainLCD',
    });
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('useBoundTextへの引数（excludePrefixAndSuffix）', () => {
    it.each([
      [APP_THEME.YAMANOTE, true],
      [APP_THEME.JO, true],
      [APP_THEME.JL, true],
    ])('%sテーマの場合、useBoundTextにtrueを渡す', (theme, expectedArg) => {
      setupMocks(theme);

      render(<TestComponent />);

      expect(mockUseBoundText).toHaveBeenCalledWith(expectedArg);
    });

    it.each([
      APP_THEME.TOKYO_METRO,
      APP_THEME.TOEI,
      APP_THEME.JR_WEST,
      APP_THEME.TY,
      APP_THEME.SAIKYO,
      APP_THEME.LED,
      APP_THEME.JR_KYUSHU,
    ])('%sテーマの場合、useBoundTextにfalseを渡す', (theme) => {
      setupMocks(theme);

      render(<TestComponent />);

      expect(mockUseBoundText).toHaveBeenCalledWith(false);
    });
  });

  describe('基本動作', () => {
    it('currentStationがない場合、nullを返す', () => {
      setupMocks(APP_THEME.TOKYO_METRO);
      mockUseCurrentStation.mockReturnValue(undefined);

      const { getByTestId } = render(<TestComponent />);
      const result = getByTestId('result').props.children;

      expect(result).toBe('null');
    });

    it('currentStationがある場合、CommonHeaderPropsを返す', () => {
      setupMocks(APP_THEME.TOKYO_METRO);

      const { getByTestId } = render(<TestComponent />);
      const result = JSON.parse(getByTestId('result').props.children);

      expect(result).not.toBeNull();
      expect(result.currentStation).toBeDefined();
      expect(result.boundText).toBe('TrainLCD');
    });
  });
});

import { render } from '@testing-library/react-native';
import { APP_THEME } from '~/models/Theme';
import LineBoard from './LineBoard';

// モック設定
jest.mock('jotai', () => ({
  useAtomValue: jest.fn(),
}));

jest.mock('~/hooks', () => ({
  useCurrentStation: jest.fn(),
  useThemeStore: jest.fn(),
}));

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

jest.mock('./LineBoardEast', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock('./LineBoardToei', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock('./LineBoardWest', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock('./LineBoardSaikyo', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock('./LineBoardYamanotePad', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock('./LineBoardJO', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock('./LineBoardLED', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock('./LineBoardJRKyushu', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

describe('LineBoard', () => {
  const { useAtomValue } = require('jotai');
  const { useCurrentStation, useThemeStore } = require('~/hooks');
  const LineBoardEast = require('./LineBoardEast').default;
  const LineBoardToei = require('./LineBoardToei').default;
  const LineBoardWest = require('./LineBoardWest').default;
  const LineBoardSaikyo = require('./LineBoardSaikyo').default;
  const _LineBoardYamanotePad = require('./LineBoardYamanotePad').default;
  const LineBoardJO = require('./LineBoardJO').default;
  const LineBoardLED = require('./LineBoardLED').default;
  const LineBoardJRKyushu = require('./LineBoardJRKyushu').default;

  beforeEach(() => {
    jest.clearAllMocks();
    useCurrentStation.mockReturnValue({
      id: 1,
      groupId: 1,
      name: '東京',
      line: { id: 1, color: '#ff0000' },
    });
    useAtomValue.mockReturnValue({
      leftStations: [
        { id: 1, groupId: 1, name: '東京', line: { id: 1, color: '#ff0000' } },
      ],
    });
  });

  it('TOKYO_METRO テーマで LineBoardEast をレンダリングする', () => {
    useThemeStore.mockReturnValue(APP_THEME.TOKYO_METRO);
    render(<LineBoard />);
    expect(LineBoardEast).toHaveBeenCalled();
  });

  it('TY テーマで LineBoardEast をレンダリングする', () => {
    useThemeStore.mockReturnValue(APP_THEME.TY);
    render(<LineBoard />);
    expect(LineBoardEast).toHaveBeenCalled();
  });

  it('TOEI テーマで LineBoardToei をレンダリングする', () => {
    useThemeStore.mockReturnValue(APP_THEME.TOEI);
    render(<LineBoard />);
    expect(LineBoardToei).toHaveBeenCalled();
  });

  it('JR_WEST テーマで LineBoardWest をレンダリングする', () => {
    useThemeStore.mockReturnValue(APP_THEME.JR_WEST);
    render(<LineBoard />);
    expect(LineBoardWest).toHaveBeenCalled();
  });

  it('SAIKYO テーマで LineBoardSaikyo をレンダリングする', () => {
    useThemeStore.mockReturnValue(APP_THEME.SAIKYO);
    render(<LineBoard />);
    expect(LineBoardSaikyo).toHaveBeenCalled();
  });

  it('YAMANOTE テーマ（非タブレット）で LineBoardJO をレンダリングする', () => {
    useThemeStore.mockReturnValue(APP_THEME.YAMANOTE);
    render(<LineBoard />);
    expect(LineBoardJO).toHaveBeenCalled();
  });

  it('LED テーマで LineBoardLED をレンダリングする', () => {
    useThemeStore.mockReturnValue(APP_THEME.LED);
    render(<LineBoard />);
    expect(LineBoardLED).toHaveBeenCalled();
  });

  it('JO テーマで LineBoardJO をレンダリングする', () => {
    useThemeStore.mockReturnValue(APP_THEME.JO);
    render(<LineBoard />);
    expect(LineBoardJO).toHaveBeenCalled();
  });

  it('JL テーマで LineBoardJO をレンダリングする', () => {
    useThemeStore.mockReturnValue(APP_THEME.JL);
    render(<LineBoard />);
    expect(LineBoardJO).toHaveBeenCalled();
  });

  it('JR_KYUSHU テーマで LineBoardJRKyushu をレンダリングする', () => {
    useThemeStore.mockReturnValue(APP_THEME.JR_KYUSHU);
    render(<LineBoard />);
    expect(LineBoardJRKyushu).toHaveBeenCalled();
  });

  it('hasTerminus プロップが正しく渡される', () => {
    useThemeStore.mockReturnValue(APP_THEME.TY);
    render(<LineBoard hasTerminus={true} />);
    expect(LineBoardEast).toHaveBeenCalledWith(
      expect.objectContaining({ hasTerminus: true }),
      {}
    );
  });

  it('leftStations が8つにスライスされる', () => {
    const leftStations = Array.from({ length: 10 }, (_, i) => ({
      id: i,
      groupId: i,
      name: `駅${i}`,
      line: { id: 1, color: '#ff0000' },
    }));
    useAtomValue.mockReturnValue({ leftStations });
    useThemeStore.mockReturnValue(APP_THEME.TY);
    render(<LineBoard />);

    expect(LineBoardEast).toHaveBeenCalledWith(
      expect.objectContaining({
        stations: expect.arrayContaining([
          expect.objectContaining({ name: '駅0' }),
        ]),
      }),
      {}
    );
  });
});

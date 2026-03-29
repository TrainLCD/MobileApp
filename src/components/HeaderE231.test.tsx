import { render } from '@testing-library/react-native';
import { createMockHeaderProps } from '~/__fixtures__/headerProps';
import HeaderE231 from './HeaderE231';

jest.mock('jotai', () => ({
  useAtomValue: jest.fn(() => ({})),
}));

jest.mock('~/hooks', () => ({
  useCurrentLine: jest.fn(() => ({ id: 1, name: 'Test', color: '#FFD400' })),
  useClock: jest.fn(() => ['12', '34']),
  useInterval: jest.fn(),
}));

jest.mock('~/store/atoms/navigation', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('~/translation', () => ({
  translate: jest.fn((key: string) => `translated:${key}`),
}));

jest.mock('~/utils/isTablet', () => ({ __esModule: true, default: false }));
jest.mock('~/utils/rfValue', () => ({ RFValue: jest.fn((v) => v) }));

jest.mock('./NumberingIcon', () => {
  const { View } = require('react-native');
  return function MockNumberingIcon() {
    return <View testID="NumberingIcon" />;
  };
});

jest.mock('./TrainTypeBoxE231', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: () => <View testID="TrainTypeBoxE231" />,
  };
});

describe('HeaderE231', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('クラッシュせずにレンダリングされる', () => {
    expect(() => {
      render(<HeaderE231 {...createMockHeaderProps()} />);
    }).not.toThrow();
  });

  it('stateTextが空の場合にフォールバックテキストが表示される', () => {
    const { getByText } = render(
      <HeaderE231
        {...createMockHeaderProps({ stateText: '', headerLangState: 'JA' })}
      />
    );
    expect(getByText('translated:nowStoppingAt')).toBeTruthy();
  });

  it('英語のフォールバックステートが表示される', () => {
    const { getByText } = render(
      <HeaderE231
        {...createMockHeaderProps({ stateText: '', headerLangState: 'EN' })}
      />
    );
    expect(getByText('translated:nowStoppingAtEn')).toBeTruthy();
  });

  it('始発表示で行先テキストが空になる', () => {
    const { queryByText } = render(
      <HeaderE231
        {...createMockHeaderProps({
          firstStop: true,
          boundText: '東京',
          headerLangState: 'JA',
        })}
      />
    );
    expect(queryByText('東京')).toBeNull();
  });

  it('始発表示で日本語の行サフィックスが表示される', () => {
    const { getByText } = render(
      <HeaderE231
        {...createMockHeaderProps({
          firstStop: true,
          headerLangState: 'JA',
        })}
      />
    );
    expect(getByText('行')).toBeTruthy();
  });

  it('始発表示でかなのゆきサフィックスが表示される', () => {
    const { getByText } = render(
      <HeaderE231
        {...createMockHeaderProps({
          firstStop: true,
          headerLangState: 'KANA',
        })}
      />
    );
    expect(getByText('ゆき')).toBeTruthy();
  });

  it('非始発時にサフィックスが表示されない', () => {
    const { queryByText } = render(
      <HeaderE231
        {...createMockHeaderProps({
          firstStop: false,
          headerLangState: 'JA',
        })}
      />
    );
    expect(queryByText('行')).toBeNull();
  });

  it('時計が表示される', () => {
    const { getByText } = render(<HeaderE231 {...createMockHeaderProps()} />);
    expect(getByText('12')).toBeTruthy();
    expect(getByText('34')).toBeTruthy();
    expect(getByText('現在時刻')).toBeTruthy();
  });
});

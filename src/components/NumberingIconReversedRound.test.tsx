import { render } from '@testing-library/react-native';
import { NUMBERING_ICON_SIZE } from '~/constants';
import NumberingIconReversedRound from './NumberingIconReversedRound';

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

describe('NumberingIconReversedRound', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('通常サイズでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconReversedRound lineColor="#ff0000" stationNumber="M-01" />
    );
    expect(getByText('M')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('SMALLサイズでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconReversedRound
        lineColor="#ff0000"
        stationNumber="M-01"
        size={NUMBERING_ICON_SIZE.SMALL}
      />
    );
    expect(getByText('M')).toBeTruthy();
  });

  it('MEDIUMサイズでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconReversedRound
        lineColor="#ff0000"
        stationNumber="M-01"
        size={NUMBERING_ICON_SIZE.MEDIUM}
      />
    );
    expect(getByText('M')).toBeTruthy();
  });

  it('2文字のlineSymbolで正しくレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconReversedRound lineColor="#ff0000" stationNumber="MM-01" />
    );
    expect(getByText('MM')).toBeTruthy();
  });

  it('withOutline=trueでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconReversedRound
        lineColor="#ff0000"
        stationNumber="M-01"
        withOutline={true}
      />
    );
    expect(getByText('M')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('サブナンバーを含むstationNumberが正しく処理される', () => {
    const { getByText } = render(
      <NumberingIconReversedRound lineColor="#ff0000" stationNumber="M-01-02" />
    );
    expect(getByText('M')).toBeTruthy();
    expect(getByText('01-02')).toBeTruthy();
  });
});

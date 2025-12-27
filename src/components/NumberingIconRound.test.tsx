import { render } from '@testing-library/react-native';
import { NUMBERING_ICON_SIZE } from '~/constants';
import NumberingIconRound from './NumberingIconRound';

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

describe('NumberingIconRound', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('通常サイズでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconRound lineColor="#ff0000" stationNumber="JY-01" />
    );
    expect(getByText('JY')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('SMALLサイズでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconRound
        lineColor="#ff0000"
        stationNumber="JY-01"
        size={NUMBERING_ICON_SIZE.SMALL}
      />
    );
    expect(getByText('JY')).toBeTruthy();
  });

  it('MEDIUMサイズでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconRound
        lineColor="#ff0000"
        stationNumber="JY-01"
        size={NUMBERING_ICON_SIZE.MEDIUM}
      />
    );
    expect(getByText('JY')).toBeTruthy();
  });

  it('2文字のlineSymbolで正しくレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconRound lineColor="#ff0000" stationNumber="KK-01" />
    );
    expect(getByText('KK')).toBeTruthy();
  });

  it('withOutline=trueでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconRound
        lineColor="#ff0000"
        stationNumber="JY-01"
        withOutline={true}
      />
    );
    expect(getByText('JY')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('サブナンバーを含むstationNumberが正しく処理される', () => {
    const { getByText } = render(
      <NumberingIconRound lineColor="#ff0000" stationNumber="JY-01-02" />
    );
    expect(getByText('JY')).toBeTruthy();
    expect(getByText('01-02')).toBeTruthy();
  });
});

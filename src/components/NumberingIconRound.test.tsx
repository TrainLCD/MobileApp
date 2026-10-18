import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
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

  it.each([
    NUMBERING_ICON_SIZE.LARGE,
    NUMBERING_ICON_SIZE.MEDIUM,
    NUMBERING_ICON_SIZE.SMALL,
  ])('三田線のIに円の内側全幅を確保する（%s）', (size) => {
    const { getByText, queryByText } = render(
      <NumberingIconRound
        lineColor="#0079c2"
        stationNumber="I-18"
        size={size}
      />
    );
    expect(StyleSheet.flatten(getByText('I').props.style)).toMatchObject({
      width: '100%',
      textAlign: 'center',
      color: '#221714',
    });
    if (size === NUMBERING_ICON_SIZE.LARGE) {
      expect(getByText('18')).toBeTruthy();
    } else {
      expect(queryByText('18')).toBeNull();
    }
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

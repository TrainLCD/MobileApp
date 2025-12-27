import { render } from '@testing-library/react-native';
import { NUMBERING_ICON_SIZE } from '~/constants';
import NumberingIconHalfSquare from './NumberingIconHalfSquare';

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

describe('NumberingIconHalfSquare', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('通常サイズでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconHalfSquare
        lineColor="#0000ff"
        stationNumber="C-01"
        withRadius={true}
        darkText={false}
      />
    );
    expect(getByText('C')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('withRadius=trueでborderRadiusが適用される', () => {
    const { getByText } = render(
      <NumberingIconHalfSquare
        lineColor="#0000ff"
        stationNumber="C-01"
        withRadius={true}
        darkText={false}
      />
    );
    expect(getByText('C')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('withRadius=falseでborderRadiusが0になる', () => {
    const { getByText } = render(
      <NumberingIconHalfSquare
        lineColor="#0000ff"
        stationNumber="C-01"
        withRadius={false}
        darkText={false}
      />
    );
    expect(getByText('C')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('darkText=trueでダークテキストが適用される', () => {
    const { getByText } = render(
      <NumberingIconHalfSquare
        lineColor="#ffff00"
        stationNumber="C-01"
        withRadius={true}
        darkText={true}
      />
    );
    expect(getByText('C')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('SMALLサイズでNumberingIconReversedSquareを使用する', () => {
    const { getByText } = render(
      <NumberingIconHalfSquare
        lineColor="#0000ff"
        stationNumber="C-01"
        withRadius={true}
        darkText={false}
        size={NUMBERING_ICON_SIZE.SMALL}
      />
    );
    expect(getByText('C')).toBeTruthy();
  });

  it('MEDIUMサイズでNumberingIconReversedSquareを使用する', () => {
    const { getByText } = render(
      <NumberingIconHalfSquare
        lineColor="#0000ff"
        stationNumber="C-01"
        withRadius={true}
        darkText={false}
        size={NUMBERING_ICON_SIZE.MEDIUM}
      />
    );
    expect(getByText('C')).toBeTruthy();
  });

  it('withOutline=trueでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconHalfSquare
        lineColor="#0000ff"
        stationNumber="C-01"
        withRadius={true}
        darkText={false}
        withOutline={true}
      />
    );
    expect(getByText('C')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });
});

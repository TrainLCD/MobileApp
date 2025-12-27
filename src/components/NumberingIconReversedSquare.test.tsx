import { render } from '@testing-library/react-native';
import { NUMBERING_ICON_SIZE } from '~/constants';
import NumberingIconReversedSquare from './NumberingIconReversedSquare';

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

describe('NumberingIconReversedSquare', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('通常サイズでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconReversedSquare
        lineColor="#0000ff"
        stationNumber="E-01"
        darkText={false}
      />
    );
    expect(getByText('E')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('SMALLサイズでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconReversedSquare
        lineColor="#0000ff"
        stationNumber="E-01"
        size={NUMBERING_ICON_SIZE.SMALL}
      />
    );
    expect(getByText('E')).toBeTruthy();
  });

  it('MEDIUMサイズでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconReversedSquare
        lineColor="#0000ff"
        stationNumber="E-01"
        size={NUMBERING_ICON_SIZE.MEDIUM}
      />
    );
    expect(getByText('E')).toBeTruthy();
  });

  it('darkText=trueでレンダリングされる', () => {
    const { UNSAFE_root } = render(
      <NumberingIconReversedSquare
        lineColor="#ffff00"
        stationNumber="E-01"
        darkText={true}
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('withOutline=trueでレンダリングされる', () => {
    const { UNSAFE_root } = render(
      <NumberingIconReversedSquare
        lineColor="#0000ff"
        stationNumber="E-01"
        withOutline={true}
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('stationNumberが正しく分割される', () => {
    const { getByText } = render(
      <NumberingIconReversedSquare lineColor="#0000ff" stationNumber="E-42" />
    );
    expect(getByText('E')).toBeTruthy();
    expect(getByText('42')).toBeTruthy();
  });
});

import { render } from '@testing-library/react-native';
import { NUMBERING_ICON_SIZE } from '~/constants';
import NumberingIconKintetsu from './NumberingIconKintetsu';

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

describe('NumberingIconKintetsu', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('通常サイズでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconKintetsu lineColor="#ff9900" stationNumber="K-01" />
    );
    expect(getByText('K')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('SMALLサイズでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconKintetsu
        lineColor="#ff9900"
        stationNumber="K-01"
        size={NUMBERING_ICON_SIZE.SMALL}
      />
    );
    expect(getByText('K')).toBeTruthy();
  });

  it('MEDIUMサイズでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconKintetsu
        lineColor="#ff9900"
        stationNumber="K-01"
        size={NUMBERING_ICON_SIZE.MEDIUM}
      />
    );
    expect(getByText('K')).toBeTruthy();
  });

  it('withOutline=trueでレンダリングされる', () => {
    const { UNSAFE_root } = render(
      <NumberingIconKintetsu
        lineColor="#ff9900"
        stationNumber="K-01"
        withOutline={true}
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('stationNumberが正しく分割される', () => {
    const { getByText } = render(
      <NumberingIconKintetsu lineColor="#ff9900" stationNumber="K-99" />
    );
    expect(getByText('K')).toBeTruthy();
    expect(getByText('99')).toBeTruthy();
  });
});

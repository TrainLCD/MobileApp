import { render } from '@testing-library/react-native';
import NumberingIconTWR from './NumberingIconTWR';

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

describe('NumberingIconTWR', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('正常にレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconTWR lineColor="#ff00cc" stationNumber="R-01" />
    );
    expect(getByText('R')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('withOutline=trueでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconTWR
        lineColor="#ff00cc"
        stationNumber="R-01"
        withOutline={true}
      />
    );
    expect(getByText('R')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('stationNumberが正しく分割される', () => {
    const { getByText } = render(
      <NumberingIconTWR lineColor="#ff00cc" stationNumber="R-13" />
    );
    expect(getByText('R')).toBeTruthy();
    expect(getByText('13')).toBeTruthy();
  });
});

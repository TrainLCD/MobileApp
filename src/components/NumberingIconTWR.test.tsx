import { render } from '@testing-library/react-native';
import NumberingIconTWR from './NumberingIconTWR';

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

describe('NumberingIconTWR', () => {
  it('正常にレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconTWR lineColor="#ff00cc" stationNumber="R-01" />
    );
    expect(getByText('R')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('withOutline=trueでレンダリングされる', () => {
    const { UNSAFE_root } = render(
      <NumberingIconTWR
        lineColor="#ff00cc"
        stationNumber="R-01"
        withOutline={true}
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('stationNumberが正しく分割される', () => {
    const { getByText } = render(
      <NumberingIconTWR lineColor="#ff00cc" stationNumber="R-13" />
    );
    expect(getByText('R')).toBeTruthy();
    expect(getByText('13')).toBeTruthy();
  });

  it('lineColorがbackgroundColorに適用される', () => {
    const { UNSAFE_root } = render(
      <NumberingIconTWR lineColor="#00ffaa" stationNumber="R-01" />
    );
    expect(UNSAFE_root).toBeTruthy();
  });
});

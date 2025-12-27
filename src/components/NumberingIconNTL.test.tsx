import { render } from '@testing-library/react-native';
import NumberingIconNTL from './NumberingIconNTL';

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

describe('NumberingIconNTL', () => {
  it('正常にレンダリングされる', () => {
    const { getByText } = render(<NumberingIconNTL stationNumber="NT-01" />);
    expect(getByText('NT')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('withOutline=trueでレンダリングされる', () => {
    const { UNSAFE_root } = render(
      <NumberingIconNTL stationNumber="NT-01" withOutline={true} />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('stationNumberが正しく分割される', () => {
    const { getByText } = render(<NumberingIconNTL stationNumber="NT-22" />);
    expect(getByText('NT')).toBeTruthy();
    expect(getByText('22')).toBeTruthy();
  });
});

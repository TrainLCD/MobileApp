import { render } from '@testing-library/react-native';
import NumberingIconKeio from './NumberingIconKeio';

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

describe('NumberingIconKeio', () => {
  it('正常にレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconKeio lineColor="#ff00ff" stationNumber="KO-01" />
    );
    expect(getByText('KO')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('stationNumberが正しく分割される', () => {
    const { getByText } = render(
      <NumberingIconKeio lineColor="#ff00ff" stationNumber="KO-50" />
    );
    expect(getByText('KO')).toBeTruthy();
    expect(getByText('50')).toBeTruthy();
  });

  it('withOutline=trueでレンダリングされる', () => {
    const { UNSAFE_root } = render(
      <NumberingIconKeio
        lineColor="#ff00ff"
        stationNumber="KO-01"
        withOutline={true}
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('lineColorがbackgroundColorに適用される', () => {
    const { UNSAFE_root } = render(
      <NumberingIconKeio lineColor="#ff00ff" stationNumber="KO-01" />
    );
    expect(UNSAFE_root).toBeTruthy();
  });
});

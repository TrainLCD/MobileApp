import { render } from '@testing-library/react-native';
import NumberingIconHankyu from './NumberingIconHankyu';

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

describe('NumberingIconHankyu', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('正常にレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconHankyu lineColor="#ff6600" stationNumber="HK-01" />
    );
    expect(getByText('HK')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('stationNumberが正しく分割される', () => {
    const { getByText } = render(
      <NumberingIconHankyu lineColor="#ff6600" stationNumber="HK-25" />
    );
    expect(getByText('HK')).toBeTruthy();
    expect(getByText('25')).toBeTruthy();
  });

  it('withOutline=trueでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconHankyu
        lineColor="#ff6600"
        stationNumber="HK-01"
        withOutline={true}
      />
    );
    expect(getByText('HK')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });
});

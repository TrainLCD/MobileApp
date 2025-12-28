import { render } from '@testing-library/react-native';
import NumberingIconHanshin from './NumberingIconHanshin';

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

describe('NumberingIconHanshin', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('正常にレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconHanshin lineColor="#0066cc" stationNumber="HS-01" />
    );
    expect(getByText('HS')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('stationNumberが正しく分割される', () => {
    const { getByText } = render(
      <NumberingIconHanshin lineColor="#0066cc" stationNumber="HS-15" />
    );
    expect(getByText('HS')).toBeTruthy();
    expect(getByText('15')).toBeTruthy();
  });

  it('withOutline=trueでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconHanshin
        lineColor="#0066cc"
        stationNumber="HS-01"
        withOutline={true}
      />
    );
    expect(getByText('HS')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });
});

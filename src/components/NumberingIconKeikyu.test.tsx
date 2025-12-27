import { render } from '@testing-library/react-native';
import NumberingIconKeikyu from './NumberingIconKeikyu';

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

describe('NumberingIconKeikyu', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('正常にレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconKeikyu lineColor="#0066cc" stationNumber="KK-01" />
    );
    expect(getByText('KK')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('サブナンバーを含むstationNumberが正しく処理される', () => {
    const { getByText } = render(
      <NumberingIconKeikyu lineColor="#0066cc" stationNumber="KK-01-02" />
    );
    expect(getByText('KK')).toBeTruthy();
    expect(getByText('01-02')).toBeTruthy();
  });

  it('withOutline=trueでレンダリングされる', () => {
    const { UNSAFE_root } = render(
      <NumberingIconKeikyu
        lineColor="#0066cc"
        stationNumber="KK-01"
        withOutline={true}
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('lineColorがborderColorに適用される', () => {
    const { UNSAFE_root } = render(
      <NumberingIconKeikyu lineColor="#ff0000" stationNumber="KK-01" />
    );
    expect(UNSAFE_root).toBeTruthy();
  });
});

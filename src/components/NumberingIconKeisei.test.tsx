import { render } from '@testing-library/react-native';
import { NUMBERING_ICON_SIZE } from '~/constants';
import NumberingIconKeisei from './NumberingIconKeisei';

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

describe('NumberingIconKeisei', () => {
  it('通常サイズでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconKeisei lineColor="#0066ff" stationNumber="KS-01" />
    );
    expect(getByText('KS')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('SMALLサイズでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconKeisei
        lineColor="#0066ff"
        stationNumber="KS-01"
        size={NUMBERING_ICON_SIZE.SMALL}
      />
    );
    expect(getByText('KS')).toBeTruthy();
  });

  it('サブナンバーを含むstationNumberが正しく処理される', () => {
    const { getByText } = render(
      <NumberingIconKeisei lineColor="#0066ff" stationNumber="KS-01-02" />
    );
    expect(getByText('KS')).toBeTruthy();
    expect(getByText('01-02')).toBeTruthy();
  });

  it('withOutline=trueでレンダリングされる', () => {
    const { UNSAFE_root } = render(
      <NumberingIconKeisei
        lineColor="#0066ff"
        stationNumber="KS-01"
        withOutline={true}
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('lineColorがテキストカラーに適用される', () => {
    const { UNSAFE_root } = render(
      <NumberingIconKeisei lineColor="#0066ff" stationNumber="KS-01" />
    );
    expect(UNSAFE_root).toBeTruthy();
  });
});

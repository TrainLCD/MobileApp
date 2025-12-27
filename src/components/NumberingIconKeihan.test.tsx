import { render } from '@testing-library/react-native';
import { NUMBERING_ICON_SIZE } from '~/constants';
import NumberingIconKeihan from './NumberingIconKeihan';

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

describe('NumberingIconKeihan', () => {
  it('通常サイズでレンダリングされる', () => {
    const { getByText } = render(<NumberingIconKeihan stationNumber="KH-01" />);
    expect(getByText('KH')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('SMALLサイズでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconKeihan
        stationNumber="KH-01"
        size={NUMBERING_ICON_SIZE.SMALL}
      />
    );
    expect(getByText('KH')).toBeTruthy();
  });

  it('MEDIUMサイズでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconKeihan
        stationNumber="KH-01"
        size={NUMBERING_ICON_SIZE.MEDIUM}
      />
    );
    expect(getByText('KH')).toBeTruthy();
  });

  it('withOutline=trueでレンダリングされる', () => {
    const { UNSAFE_root } = render(
      <NumberingIconKeihan stationNumber="KH-01" withOutline={true} />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('stationNumberが正しく分割される', () => {
    const { getByText } = render(<NumberingIconKeihan stationNumber="KH-42" />);
    expect(getByText('KH')).toBeTruthy();
    expect(getByText('42')).toBeTruthy();
  });
});

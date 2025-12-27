import { render } from '@testing-library/react-native';
import { NUMBERING_ICON_SIZE } from '~/constants';
import NumberingIconIzuhakone from './NumberingIconIzuhakone';

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

describe('NumberingIconIzuhakone', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('通常サイズでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconIzuhakone lineColor="#ff6600" stationNumber="IZ-01" />
    );
    expect(getByText('IZ')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('SMALLサイズでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconIzuhakone
        lineColor="#ff6600"
        stationNumber="IZ-01"
        size={NUMBERING_ICON_SIZE.SMALL}
      />
    );
    expect(getByText('IZ')).toBeTruthy();
  });

  it('MEDIUMサイズでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconIzuhakone
        lineColor="#ff6600"
        stationNumber="IZ-01"
        size={NUMBERING_ICON_SIZE.MEDIUM}
      />
    );
    expect(getByText('IZ')).toBeTruthy();
  });

  it('withOutline=trueでレンダリングされる', () => {
    const { UNSAFE_root } = render(
      <NumberingIconIzuhakone
        lineColor="#ff6600"
        stationNumber="IZ-01"
        withOutline={true}
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('lineSymbolとstationNumberが正しく分割される', () => {
    const { getByText } = render(
      <NumberingIconIzuhakone lineColor="#ff6600" stationNumber="IZ-99" />
    );
    expect(getByText('IZ')).toBeTruthy();
    expect(getByText('99')).toBeTruthy();
  });
});

import { render } from '@testing-library/react-native';
import { NUMBERING_ICON_SIZE } from '~/constants';
import NumberingIconRoundHorizontal from './NumberingIconRoundHorizontal';

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

describe('NumberingIconRoundHorizontal', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('通常サイズでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconRoundHorizontal lineColor="#00ff00" stationNumber="S-01" />
    );
    expect(getByText('S01')).toBeTruthy();
  });

  it('SMALLサイズでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconRoundHorizontal
        lineColor="#00ff00"
        stationNumber="S-01"
        size={NUMBERING_ICON_SIZE.SMALL}
      />
    );
    expect(getByText('S')).toBeTruthy();
  });

  it('MEDIUMサイズでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconRoundHorizontal
        lineColor="#00ff00"
        stationNumber="S-01"
        size={NUMBERING_ICON_SIZE.MEDIUM}
      />
    );
    expect(getByText('S')).toBeTruthy();
  });

  it('withOutline=trueでレンダリングされる', () => {
    const { UNSAFE_root } = render(
      <NumberingIconRoundHorizontal
        lineColor="#00ff00"
        stationNumber="S-01"
        withOutline={true}
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('2文字のlineSymbolで正しくレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconRoundHorizontal lineColor="#00ff00" stationNumber="SS-01" />
    );
    expect(getByText('SS01')).toBeTruthy();
  });
});

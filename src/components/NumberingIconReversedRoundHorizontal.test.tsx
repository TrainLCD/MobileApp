import { render } from '@testing-library/react-native';
import { NUMBERING_ICON_SIZE } from '~/constants';
import NumberingIconReversedRoundHorizontal from './NumberingIconReversedRoundHorizontal';

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

describe('NumberingIconReversedRoundHorizontal', () => {
  it('通常サイズでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconReversedRoundHorizontal
        lineColor="#00ff00"
        stationNumber="A-01"
      />
    );
    expect(getByText('A01')).toBeTruthy();
  });

  it('SMALLサイズでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconReversedRoundHorizontal
        lineColor="#00ff00"
        stationNumber="A-01"
        size={NUMBERING_ICON_SIZE.SMALL}
      />
    );
    expect(getByText('A')).toBeTruthy();
  });

  it('MEDIUMサイズでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconReversedRoundHorizontal
        lineColor="#00ff00"
        stationNumber="A-01"
        size={NUMBERING_ICON_SIZE.MEDIUM}
      />
    );
    expect(getByText('A')).toBeTruthy();
  });

  it('withOutline=trueでレンダリングされる', () => {
    const { UNSAFE_root } = render(
      <NumberingIconReversedRoundHorizontal
        lineColor="#00ff00"
        stationNumber="A-01"
        withOutline={true}
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('lineSymbolとstationNumberが連結される', () => {
    const { getByText } = render(
      <NumberingIconReversedRoundHorizontal
        lineColor="#00ff00"
        stationNumber="A-99"
      />
    );
    expect(getByText('A99')).toBeTruthy();
  });
});

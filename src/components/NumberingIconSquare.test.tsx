import { render } from '@testing-library/react-native';
import { NUMBERING_ICON_SIZE } from '~/constants';
import NumberingIconSquare from './NumberingIconSquare';

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

describe('NumberingIconSquare', () => {
  it('通常サイズでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconSquare
        lineColor="#00ff00"
        stationNumber="G-01"
        allowScaling={false}
      />
    );
    expect(getByText('G')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('threeLetterCodeと一緒にレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconSquare
        lineColor="#00ff00"
        stationNumber="G-01"
        threeLetterCode="TKY"
        allowScaling={false}
      />
    );
    expect(getByText('TKY')).toBeTruthy();
    expect(getByText('G')).toBeTruthy();
  });

  it('SMALLサイズでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconSquare
        lineColor="#00ff00"
        stationNumber="G-01"
        allowScaling={false}
        size={NUMBERING_ICON_SIZE.SMALL}
      />
    );
    expect(getByText('G')).toBeTruthy();
  });

  it('allowScaling=trueでレンダリングされる', () => {
    const { UNSAFE_root } = render(
      <NumberingIconSquare
        lineColor="#00ff00"
        stationNumber="G-01"
        allowScaling={true}
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('withOutline=trueでレンダリングされる', () => {
    const { UNSAFE_root } = render(
      <NumberingIconSquare
        lineColor="#00ff00"
        stationNumber="G-01"
        allowScaling={false}
        withOutline={true}
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('transformOriginプロップが渡される', () => {
    const { UNSAFE_root } = render(
      <NumberingIconSquare
        lineColor="#00ff00"
        stationNumber="G-01"
        allowScaling={false}
        transformOrigin="top"
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });
});

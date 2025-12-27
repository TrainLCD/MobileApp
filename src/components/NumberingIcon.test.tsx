import { render } from '@testing-library/react-native';
import { MARK_SHAPE, NUMBERING_ICON_SIZE } from '~/constants';
import NumberingIcon from './NumberingIcon';

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

describe('NumberingIcon', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('ROUND shapeでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIcon
        shape={MARK_SHAPE.ROUND}
        lineColor="#ff0000"
        stationNumber="JY-01"
      />
    );
    expect(getByText('JY')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('SQUARE shapeでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIcon
        shape={MARK_SHAPE.SQUARE}
        lineColor="#00ff00"
        stationNumber="G-01"
      />
    );
    expect(getByText('G')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('REVERSED_ROUND shapeでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIcon
        shape={MARK_SHAPE.REVERSED_ROUND}
        lineColor="#0000ff"
        stationNumber="M-01"
      />
    );
    expect(getByText('M')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('REVERSED_SQUARE shapeでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIcon
        shape={MARK_SHAPE.REVERSED_SQUARE}
        lineColor="#ff00ff"
        stationNumber="E-01"
      />
    );
    expect(getByText('E')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('shouldGrayscale=trueの場合、グレースケールスタイルが適用される', () => {
    const { getByText } = render(
      <NumberingIcon
        shape={MARK_SHAPE.ROUND}
        lineColor="#ff0000"
        stationNumber="JY-01"
        shouldGrayscale={true}
      />
    );
    expect(getByText('JY')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('shouldGrayscale=falseの場合、通常スタイルが適用される', () => {
    const { getByText } = render(
      <NumberingIcon
        shape={MARK_SHAPE.ROUND}
        lineColor="#ff0000"
        stationNumber="JY-01"
        shouldGrayscale={false}
      />
    );
    expect(getByText('JY')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('KEIKYUのKK以外の駅番号でROUND shapeが使用される', () => {
    const { getByText } = render(
      <NumberingIcon
        shape={MARK_SHAPE.KEIKYU}
        lineColor="#ff0000"
        stationNumber="A-01"
      />
    );
    expect(getByText('A')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('REVERSED_SQUARE_DARK_TEXTでdarkTextプロップが渡される', () => {
    const { getByText } = render(
      <NumberingIcon
        shape={MARK_SHAPE.REVERSED_SQUARE_DARK_TEXT}
        lineColor="#ffff00"
        stationNumber="T-01"
      />
    );
    expect(getByText('T')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('threeLetterCodeプロップが正しく渡される', () => {
    const { getByText } = render(
      <NumberingIcon
        shape={MARK_SHAPE.SQUARE}
        lineColor="#00ff00"
        stationNumber="G-01"
        threeLetterCode="TKY"
      />
    );
    expect(getByText('G')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('sizeプロップが正しく渡される', () => {
    const { getByText } = render(
      <NumberingIcon
        shape={MARK_SHAPE.ROUND}
        lineColor="#ff0000"
        stationNumber="JY-01"
        size={NUMBERING_ICON_SIZE.SMALL}
      />
    );
    expect(getByText('JY')).toBeTruthy();
  });

  it('withOutlineプロップが正しく渡される', () => {
    const { getByText } = render(
      <NumberingIcon
        shape={MARK_SHAPE.ROUND}
        lineColor="#ff0000"
        stationNumber="JY-01"
        withOutline={true}
      />
    );
    expect(getByText('JY')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });
});

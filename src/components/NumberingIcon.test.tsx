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
    const { UNSAFE_root } = render(
      <NumberingIcon
        shape={MARK_SHAPE.ROUND}
        lineColor="#ff0000"
        stationNumber="JY01"
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('SQUARE shapeでレンダリングされる', () => {
    const { UNSAFE_root } = render(
      <NumberingIcon
        shape={MARK_SHAPE.SQUARE}
        lineColor="#00ff00"
        stationNumber="G01"
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('REVERSED_ROUND shapeでレンダリングされる', () => {
    const { UNSAFE_root } = render(
      <NumberingIcon
        shape={MARK_SHAPE.REVERSED_ROUND}
        lineColor="#0000ff"
        stationNumber="M01"
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('REVERSED_SQUARE shapeでレンダリングされる', () => {
    const { UNSAFE_root } = render(
      <NumberingIcon
        shape={MARK_SHAPE.REVERSED_SQUARE}
        lineColor="#ff00ff"
        stationNumber="E01"
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('shouldGrayscale=trueの場合、グレースケールスタイルが適用される', () => {
    const { UNSAFE_root } = render(
      <NumberingIcon
        shape={MARK_SHAPE.ROUND}
        lineColor="#ff0000"
        stationNumber="JY01"
        shouldGrayscale={true}
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('shouldGrayscale=falseの場合、通常スタイルが適用される', () => {
    const { UNSAFE_root } = render(
      <NumberingIcon
        shape={MARK_SHAPE.ROUND}
        lineColor="#ff0000"
        stationNumber="JY01"
        shouldGrayscale={false}
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('KEIKYUのKK以外の駅番号でROUND shapeが使用される', () => {
    const { UNSAFE_root } = render(
      <NumberingIcon
        shape={MARK_SHAPE.KEIKYU}
        lineColor="#ff0000"
        stationNumber="A01"
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('REVERSED_SQUARE_DARK_TEXTでdarkTextプロップが渡される', () => {
    const { UNSAFE_root } = render(
      <NumberingIcon
        shape={MARK_SHAPE.REVERSED_SQUARE_DARK_TEXT}
        lineColor="#ffff00"
        stationNumber="T01"
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('未知のshapeの場合、nullを返す', () => {
    const { UNSAFE_root } = render(
      <NumberingIcon
        shape="UNKNOWN_SHAPE"
        lineColor="#ff0000"
        stationNumber="X01"
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('threeLetterCodeプロップが正しく渡される', () => {
    const { UNSAFE_root } = render(
      <NumberingIcon
        shape={MARK_SHAPE.SQUARE}
        lineColor="#00ff00"
        stationNumber="G01"
        threeLetterCode="TKY"
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('sizeプロップが正しく渡される', () => {
    const { UNSAFE_root } = render(
      <NumberingIcon
        shape={MARK_SHAPE.ROUND}
        lineColor="#ff0000"
        stationNumber="JY01"
        size={NUMBERING_ICON_SIZE.SMALL}
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('withOutlineプロップが正しく渡される', () => {
    const { UNSAFE_root } = render(
      <NumberingIcon
        shape={MARK_SHAPE.ROUND}
        lineColor="#ff0000"
        stationNumber="JY01"
        withOutline={true}
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });
});

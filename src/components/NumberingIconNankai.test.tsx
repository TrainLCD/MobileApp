import { render } from '@testing-library/react-native';
import { NUMBERING_ICON_SIZE } from '~/constants';
import NumberingIconNankai from './NumberingIconNankai';

// isTablet=false 時のアイコン外形サイズ
const ICON_SIZE = 72;

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

jest.mock('react-native-svg', () => {
  const _React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: unknown) => <View {...(props as object)} />,
    Ellipse: (props: unknown) => (
      <View {...(props as object)} testID="ellipse" />
    ),
  };
});

describe('NumberingIconNankai', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('通常サイズでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconNankai lineColor="#0066cc" stationNumber="NK-01" />
    );
    expect(getByText('NK')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('SMALLサイズでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconNankai
        lineColor="#0066cc"
        stationNumber="NK-01"
        size={NUMBERING_ICON_SIZE.SMALL}
      />
    );
    expect(getByText('NK')).toBeTruthy();
  });

  it('withOutline=trueでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconNankai
        lineColor="#0066cc"
        stationNumber="NK-01"
        withOutline={true}
      />
    );
    expect(getByText('NK')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it.each([
    ['withOutlineなし', undefined, 1],
    ['withOutlineあり', true, 2],
  ])(
    '%s のとき楕円のフチが描画領域からはみ出さない',
    (_label, withOutline, expectedStrokeWidth) => {
      const { getByTestId } = render(
        <NumberingIconNankai
          lineColor="#0066cc"
          stationNumber="NK-01"
          withOutline={withOutline}
        />
      );
      const ellipse = getByTestId('ellipse');
      const { cx, cy, rx, ry, strokeWidth } = ellipse.props;

      expect(strokeWidth).toBe(expectedStrokeWidth);
      // フチはパスの中心から左右に strokeWidth / 2 ずつ広がる
      expect(cx - rx - strokeWidth / 2).toBeGreaterThanOrEqual(0);
      expect(cx + rx + strokeWidth / 2).toBeLessThanOrEqual(ICON_SIZE);
      expect(cy - ry - strokeWidth / 2).toBeGreaterThanOrEqual(0);
      expect(cy + ry + strokeWidth / 2).toBeLessThanOrEqual(ICON_SIZE);
    }
  );

  it('withOutlineの有無でアイコンの占有サイズが変わらない', () => {
    const withoutOutline = render(
      <NumberingIconNankai lineColor="#0066cc" stationNumber="NK-01" />
    ).getByTestId('ellipse');
    const withOutline = render(
      <NumberingIconNankai
        lineColor="#0066cc"
        stationNumber="NK-01"
        withOutline={true}
      />
    ).getByTestId('ellipse');

    type EllipseProps = { rx: number; ry: number; strokeWidth: number };
    const outerWidth = (props: EllipseProps) =>
      props.rx * 2 + props.strokeWidth;
    const outerHeight = (props: EllipseProps) =>
      props.ry * 2 + props.strokeWidth;

    expect(outerWidth(withOutline.props as EllipseProps)).toBe(
      outerWidth(withoutOutline.props as EllipseProps)
    );
    expect(outerHeight(withOutline.props as EllipseProps)).toBe(
      outerHeight(withoutOutline.props as EllipseProps)
    );
  });

  it('記号と番号が折り返されない', () => {
    const { getByText } = render(
      <NumberingIconNankai lineColor="#0066cc" stationNumber="NK-01" />
    );
    expect(getByText('NK').props.numberOfLines).toBe(1);
    expect(getByText('01').props.numberOfLines).toBe(1);
  });

  it('stationNumberが正しく分割される', () => {
    const { getByText } = render(
      <NumberingIconNankai lineColor="#0066cc" stationNumber="NK-42" />
    );
    expect(getByText('NK')).toBeTruthy();
    expect(getByText('42')).toBeTruthy();
  });
});

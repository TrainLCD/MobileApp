import { render } from '@testing-library/react-native';
import { EmptyStationNameCell } from './EmptyStationNameCell';

// モック設定
jest.mock('../hooks/useBarStyles', () => ({
  useBarStyles: jest.fn(() => ({
    left: 10,
    width: 50,
  })),
}));

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

jest.mock('../../../BarTerminalEast', () => {
  const _React = require('react');
  const { View } = require('react-native');
  return {
    BarTerminalEast: ({
      testID = 'bar-terminal-east',
      ...props
    }: {
      testID?: string;
      lineColor?: string;
      hasTerminus?: boolean;
      width?: number;
      height?: number;
      style?: unknown;
    }) => <View testID={testID} {...props} />,
  };
});

describe('EmptyStationNameCell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('isLast=false の場合、BarTerminalEastは表示されない', () => {
    const { queryByTestId } = render(
      <EmptyStationNameCell
        lastLineColor="#ff0000"
        isLast={false}
        hasTerminus={false}
      />
    );

    expect(queryByTestId('bar-terminal-east')).toBeNull();
  });

  it('isLast=true の場合、BarTerminalEastが表示される', () => {
    const { getByTestId } = render(
      <EmptyStationNameCell
        lastLineColor="#ff0000"
        isLast={true}
        hasTerminus={false}
      />
    );

    expect(getByTestId('bar-terminal-east')).toBeTruthy();
  });

  it('isLast=true かつ hasTerminus=true の場合、BarTerminalEastにhasTerminusが渡される', () => {
    const { getByTestId } = render(
      <EmptyStationNameCell
        lastLineColor="#ff0000"
        isLast={true}
        hasTerminus={true}
      />
    );

    const barTerminal = getByTestId('bar-terminal-east');
    expect(barTerminal.props.hasTerminus).toBe(true);
  });

  it('lastLineColorが指定されている場合、LinearGradientに正しい色が渡される', () => {
    const testColor = '#ff0000';
    const { UNSAFE_getAllByType } = render(
      <EmptyStationNameCell
        lastLineColor={testColor}
        isLast={false}
        hasTerminus={false}
      />
    );

    const LinearGradient = require('expo-linear-gradient').LinearGradient;
    const gradients = UNSAFE_getAllByType(LinearGradient);

    // 2つ目のLinearGradientがカラーラインのグラデーション
    const colorGradient = gradients[1];
    expect(colorGradient.props.colors).toEqual([
      `${testColor}ff`,
      `${testColor}bb`,
    ]);
  });

  it('lastLineColorが空文字の場合、デフォルトの黒色が使用される', () => {
    const { UNSAFE_getAllByType } = render(
      <EmptyStationNameCell
        lastLineColor=""
        isLast={false}
        hasTerminus={false}
      />
    );

    const LinearGradient = require('expo-linear-gradient').LinearGradient;
    const gradients = UNSAFE_getAllByType(LinearGradient);

    // 2つ目のLinearGradientがカラーラインのグラデーション
    const colorGradient = gradients[1];
    expect(colorGradient.props.colors).toEqual(['#000000ff', '#000000bb']);
  });

  it('useBarStylesから取得したleftとwidthが正しく適用される', () => {
    const mockUseBarStyles = require('../hooks/useBarStyles').useBarStyles;
    mockUseBarStyles.mockReturnValue({
      left: 20,
      width: 60,
    });

    const { UNSAFE_getAllByType } = render(
      <EmptyStationNameCell
        lastLineColor="#ff0000"
        isLast={false}
        hasTerminus={false}
      />
    );

    const LinearGradient = require('expo-linear-gradient').LinearGradient;
    const gradients = UNSAFE_getAllByType(LinearGradient);

    // 最初のLinearGradient
    const firstGradient = gradients[0];
    expect(firstGradient.props.style).toContainEqual(
      expect.objectContaining({
        left: 20,
        width: 60,
      })
    );

    // 2つ目のLinearGradient
    const secondGradient = gradients[1];
    expect(secondGradient.props.style).toContainEqual(
      expect.objectContaining({
        left: 20,
        width: 60,
      })
    );
  });

  it('isLast=true の場合、BarTerminalEastに正しいlineColorが渡される', () => {
    const testColor = '#00ff00';
    const { getByTestId } = render(
      <EmptyStationNameCell
        lastLineColor={testColor}
        isLast={true}
        hasTerminus={false}
      />
    );

    const barTerminal = getByTestId('bar-terminal-east');
    expect(barTerminal.props.lineColor).toBe(testColor);
  });

  it('2つのLinearGradientがレンダリングされる', () => {
    const { UNSAFE_getAllByType } = render(
      <EmptyStationNameCell
        lastLineColor="#ff0000"
        isLast={false}
        hasTerminus={false}
      />
    );

    const LinearGradient = require('expo-linear-gradient').LinearGradient;
    const gradients = UNSAFE_getAllByType(LinearGradient);

    expect(gradients).toHaveLength(2);
  });
});

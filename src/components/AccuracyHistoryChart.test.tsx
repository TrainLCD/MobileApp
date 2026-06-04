import { render } from '@testing-library/react-native';
import { processColor } from 'react-native';
import { ACCURACY_CHART_COLORS } from '~/utils/accuracyChart';
import AccuracyHistoryChart from './AccuracyHistoryChart';

describe('AccuracyHistoryChart', () => {
  it('renders one point per valid sample', () => {
    const { getAllByTestId } = render(
      <AccuracyHistoryChart
        history={[10, 20, 30, 40]}
        width={120}
        height={40}
      />
    );
    expect(getAllByTestId('dev-overlay-accuracy-point')).toHaveLength(4);
  });

  it('renders a single point for a single sample', () => {
    const { getAllByTestId } = render(
      <AccuracyHistoryChart history={[15]} width={120} height={40} />
    );
    expect(getAllByTestId('dev-overlay-accuracy-point')).toHaveLength(1);
  });

  it('drops invalid samples before plotting', () => {
    const { getAllByTestId } = render(
      <AccuracyHistoryChart
        history={[10, Number.NaN, 50, -5]}
        width={120}
        height={40}
      />
    );
    expect(getAllByTestId('dev-overlay-accuracy-point')).toHaveLength(2);
  });

  it('shows a placeholder when there are no valid samples', () => {
    const { getByTestId, queryAllByTestId } = render(
      <AccuracyHistoryChart
        history={[Number.NaN, Number.POSITIVE_INFINITY]}
        width={120}
        height={40}
      />
    );
    expect(getByTestId('dev-overlay-accuracy-history')).toHaveTextContent(
      '---'
    );
    expect(queryAllByTestId('dev-overlay-accuracy-point')).toHaveLength(0);
  });

  it('shows a placeholder for empty history', () => {
    const { getByTestId } = render(
      <AccuracyHistoryChart history={[]} width={120} height={40} />
    );
    expect(getByTestId('dev-overlay-accuracy-history')).toHaveTextContent(
      '---'
    );
  });

  it('plots worse (higher) accuracy nearer the top', () => {
    const { getAllByTestId } = render(
      <AccuracyHistoryChart history={[10, 100]} width={120} height={40} />
    );
    const [best, worst] = getAllByTestId('dev-overlay-accuracy-point');
    // 値が大きい(精度が悪い)100m の点ほど y 座標が小さい(=上端側)になる
    expect(Number(worst.props.cy)).toBeLessThan(Number(best.props.cy));
  });

  it('colors points by accuracy band', () => {
    const { getAllByTestId } = render(
      <AccuracyHistoryChart history={[50, 500, 2500]} width={120} height={40} />
    );
    const [good, warning, danger] = getAllByTestId(
      'dev-overlay-accuracy-point'
    );
    // react-native-svg は fill 文字列を内部の Brush({ type, payload }) へ変換するため
    // payload(processColor 相当の数値)で突き合わせる
    expect(good.props.fill.payload).toBe(
      processColor(ACCURACY_CHART_COLORS.good)
    );
    expect(warning.props.fill.payload).toBe(
      processColor(ACCURACY_CHART_COLORS.warning)
    );
    expect(danger.props.fill.payload).toBe(
      processColor(ACCURACY_CHART_COLORS.danger)
    );
  });
});

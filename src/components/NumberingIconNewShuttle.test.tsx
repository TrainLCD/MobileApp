import { render } from '@testing-library/react-native';
import NumberingIconNewShuttle from './NumberingIconNewShuttle';

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

jest.mock('./Hexagon', () => {
  const _React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: unknown) => (
      <View {...(props as object)} testID="hexagon" />
    ),
  };
});

describe('NumberingIconNewShuttle', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('正常にレンダリングされる', () => {
    const { getByText, getByTestId } = render(
      <NumberingIconNewShuttle lineColor="#ff00cc" stationNumber="NS-01" />
    );
    expect(getByText('NS')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
    expect(getByTestId('hexagon')).toBeTruthy();
  });

  it('withOutline=trueでレンダリングされる', () => {
    const { getByText, getByTestId } = render(
      <NumberingIconNewShuttle
        lineColor="#ff00cc"
        stationNumber="NS-01"
        withOutline={true}
      />
    );
    expect(getByText('NS')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
    expect(getByTestId('hexagon')).toBeTruthy();
  });

  it('stationNumberが正しく分割される', () => {
    const { getByText } = render(
      <NumberingIconNewShuttle lineColor="#ff00cc" stationNumber="NS-13" />
    );
    expect(getByText('NS')).toBeTruthy();
    expect(getByText('13')).toBeTruthy();
  });
});

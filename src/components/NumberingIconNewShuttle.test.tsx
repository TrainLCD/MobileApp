import { render } from '@testing-library/react-native';
import React from 'react';
import NumberingIconNewShuttle from './NumberingIconNewShuttle';

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

jest.mock('./Hexagon', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => <View {...props} testID="hexagon" />,
  };
});

describe('NumberingIconNewShuttle', () => {
  it('正常にレンダリングされる', () => {
    const { getByText, getByTestId } = render(
      <NumberingIconNewShuttle lineColor="#ff00cc" stationNumber="NS-01" />
    );
    expect(getByText('NS')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
    expect(getByTestId('hexagon')).toBeTruthy();
  });

  it('withOutline=trueでレンダリングされる', () => {
    const { UNSAFE_root } = render(
      <NumberingIconNewShuttle
        lineColor="#ff00cc"
        stationNumber="NS-01"
        withOutline={true}
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('stationNumberが正しく分割される', () => {
    const { getByText } = render(
      <NumberingIconNewShuttle lineColor="#ff00cc" stationNumber="NS-13" />
    );
    expect(getByText('NS')).toBeTruthy();
    expect(getByText('13')).toBeTruthy();
  });
});

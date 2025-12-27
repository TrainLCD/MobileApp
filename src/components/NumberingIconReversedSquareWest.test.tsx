import { render } from '@testing-library/react-native';
import React from 'react';
import NumberingIconReversedSquareWest from './NumberingIconReversedSquareWest';

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

describe('NumberingIconReversedSquareWest', () => {
  it('darkText=falseでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconReversedSquareWest
        lineColor="#0000ff"
        stationNumber="W-01"
        darkText={false}
      />
    );
    expect(getByText('W')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('darkText=trueでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconReversedSquareWest
        lineColor="#ffff00"
        stationNumber="W-01"
        darkText={true}
      />
    );
    expect(getByText('W')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('withOutline=trueでレンダリングされる', () => {
    const { UNSAFE_root } = render(
      <NumberingIconReversedSquareWest
        lineColor="#0000ff"
        stationNumber="W-01"
        withOutline={true}
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('stationNumberが正しく分割される', () => {
    const { getByText } = render(
      <NumberingIconReversedSquareWest
        lineColor="#0000ff"
        stationNumber="W-88"
      />
    );
    expect(getByText('W')).toBeTruthy();
    expect(getByText('88')).toBeTruthy();
  });
});

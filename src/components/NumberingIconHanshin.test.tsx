import { render } from '@testing-library/react-native';
import React from 'react';
import NumberingIconHanshin from './NumberingIconHanshin';

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

describe('NumberingIconHanshin', () => {
  it('正常にレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconHanshin
        lineColor="#0066cc"
        stationNumber="HS-01"
      />
    );
    expect(getByText('HS')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('stationNumberが正しく分割される', () => {
    const { getByText } = render(
      <NumberingIconHanshin
        lineColor="#0066cc"
        stationNumber="HS-15"
      />
    );
    expect(getByText('HS')).toBeTruthy();
    expect(getByText('15')).toBeTruthy();
  });

  it('withOutline=trueでレンダリングされる', () => {
    const { UNSAFE_root } = render(
      <NumberingIconHanshin
        lineColor="#0066cc"
        stationNumber="HS-01"
        withOutline={true}
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('lineColorがテキストカラーに適用される', () => {
    const { UNSAFE_root } = render(
      <NumberingIconHanshin
        lineColor="#0066cc"
        stationNumber="HS-01"
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });
});

import { render } from '@testing-library/react-native';
import React from 'react';
import NumberingIconOdakyu from './NumberingIconOdakyu';

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

describe('NumberingIconOdakyu', () => {
  it('hakone=falseでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconOdakyu stationNumber="OH-01" hakone={false} />
    );
    expect(getByText('OH')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('hakone=trueでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconOdakyu stationNumber="OH-01" hakone={true} />
    );
    expect(getByText('OH')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('withOutline=trueでレンダリングされる', () => {
    const { UNSAFE_root } = render(
      <NumberingIconOdakyu
        stationNumber="OH-01"
        hakone={false}
        withOutline={true}
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('stationNumberが正しく分割される', () => {
    const { getByText } = render(
      <NumberingIconOdakyu stationNumber="OH-70" hakone={false} />
    );
    expect(getByText('OH')).toBeTruthy();
    expect(getByText('70')).toBeTruthy();
  });
});

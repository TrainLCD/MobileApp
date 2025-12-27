import { render } from '@testing-library/react-native';
import React from 'react';
import { NUMBERING_ICON_SIZE } from '~/constants';
import NumberingIconSanyo from './NumberingIconSanyo';

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

describe('NumberingIconSanyo', () => {
  it('通常サイズでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconSanyo lineColor="#ff6600" stationNumber="SY-01" />
    );
    expect(getByText('SY')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('SMALLサイズでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconSanyo
        lineColor="#ff6600"
        stationNumber="SY-01"
        size={NUMBERING_ICON_SIZE.SMALL}
      />
    );
    expect(getByText('SY')).toBeTruthy();
  });

  it('MEDIUMサイズでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconSanyo
        lineColor="#ff6600"
        stationNumber="SY-01"
        size={NUMBERING_ICON_SIZE.MEDIUM}
      />
    );
    expect(getByText('SY')).toBeTruthy();
  });

  it('withOutline=trueでレンダリングされる', () => {
    const { UNSAFE_root } = render(
      <NumberingIconSanyo
        lineColor="#ff6600"
        stationNumber="SY-01"
        withOutline={true}
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('stationNumberが正しく分割される', () => {
    const { getByText } = render(
      <NumberingIconSanyo lineColor="#ff6600" stationNumber="SY-38" />
    );
    expect(getByText('SY')).toBeTruthy();
    expect(getByText('38')).toBeTruthy();
  });
});

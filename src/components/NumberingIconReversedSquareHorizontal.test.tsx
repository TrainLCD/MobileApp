import { render } from '@testing-library/react-native';
import React from 'react';
import { NUMBERING_ICON_SIZE } from '~/constants';
import NumberingIconReversedSquareHorizontal from './NumberingIconReversedSquareHorizontal';

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

describe('NumberingIconReversedSquareHorizontal', () => {
  it('通常サイズでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconReversedSquareHorizontal
        lineColor="#ff00ff"
        stationNumber="F-01"
      />
    );
    expect(getByText('F01')).toBeTruthy();
  });

  it('SMALLサイズでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconReversedSquareHorizontal
        lineColor="#ff00ff"
        stationNumber="F-01"
        size={NUMBERING_ICON_SIZE.SMALL}
      />
    );
    expect(getByText('F')).toBeTruthy();
  });

  it('MEDIUMサイズでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconReversedSquareHorizontal
        lineColor="#ff00ff"
        stationNumber="F-01"
        size={NUMBERING_ICON_SIZE.MEDIUM}
      />
    );
    expect(getByText('F')).toBeTruthy();
  });

  it('withOutline=trueでレンダリングされる', () => {
    const { UNSAFE_root } = render(
      <NumberingIconReversedSquareHorizontal
        lineColor="#ff00ff"
        stationNumber="F-01"
        withOutline={true}
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('lineSymbolとstationNumberが連結される', () => {
    const { getByText } = render(
      <NumberingIconReversedSquareHorizontal
        lineColor="#ff00ff"
        stationNumber="F-50"
      />
    );
    expect(getByText('F50')).toBeTruthy();
  });
});

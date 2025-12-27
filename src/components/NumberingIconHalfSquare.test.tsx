import { render } from '@testing-library/react-native';
import React from 'react';
import { NUMBERING_ICON_SIZE } from '~/constants';
import NumberingIconHalfSquare from './NumberingIconHalfSquare';

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

describe('NumberingIconHalfSquare', () => {
  it('通常サイズでレンダリングされる', () => {
    const { getByText } = render(
      <NumberingIconHalfSquare
        lineColor="#0000ff"
        stationNumber="C-01"
        withRadius={true}
        darkText={false}
      />
    );
    expect(getByText('C')).toBeTruthy();
    expect(getByText('01')).toBeTruthy();
  });

  it('withRadius=trueでborderRadiusが適用される', () => {
    const { UNSAFE_root } = render(
      <NumberingIconHalfSquare
        lineColor="#0000ff"
        stationNumber="C-01"
        withRadius={true}
        darkText={false}
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('withRadius=falseでborderRadiusが0になる', () => {
    const { UNSAFE_root } = render(
      <NumberingIconHalfSquare
        lineColor="#0000ff"
        stationNumber="C-01"
        withRadius={false}
        darkText={false}
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('darkText=trueでダークテキストが適用される', () => {
    const { UNSAFE_root } = render(
      <NumberingIconHalfSquare
        lineColor="#ffff00"
        stationNumber="C-01"
        withRadius={true}
        darkText={true}
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('SMALLサイズでNumberingIconReversedSquareを使用する', () => {
    const { UNSAFE_root } = render(
      <NumberingIconHalfSquare
        lineColor="#0000ff"
        stationNumber="C-01"
        withRadius={true}
        darkText={false}
        size={NUMBERING_ICON_SIZE.SMALL}
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('MEDIUMサイズでNumberingIconReversedSquareを使用する', () => {
    const { UNSAFE_root } = render(
      <NumberingIconHalfSquare
        lineColor="#0000ff"
        stationNumber="C-01"
        withRadius={true}
        darkText={false}
        size={NUMBERING_ICON_SIZE.MEDIUM}
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('withOutline=trueでレンダリングされる', () => {
    const { UNSAFE_root } = render(
      <NumberingIconHalfSquare
        lineColor="#0000ff"
        stationNumber="C-01"
        withRadius={true}
        darkText={false}
        withOutline={true}
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });
});

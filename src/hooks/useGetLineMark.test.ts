import { renderHook } from '@testing-library/react-native';
import { createLine, createStationNumber } from '~/utils/test/factories';
import { useGetLineMark } from './useGetLineMark';

jest.mock('../../assets/marks/tobu/ti.webp', () => 11);
jest.mock('../../assets/marks/tobu/ts.webp', () => 12);
jest.mock('../../assets/marks/tobu/ti_g.webp', () => 21);
jest.mock('../../assets/marks/tobu/ts_g.webp', () => 22);

const line = createLine(21002, {
  lineSymbols: ['TI', 'TS'].map((symbol) => ({
    __typename: 'LineSymbol',
    symbol,
    shape: 'SQUARE',
    color: null,
  })),
});

describe('useGetLineMark', () => {
  it.each([
    ['TS', 'TS-01', 12, 22],
    ['TI', 'TI-25', 11, 21],
  ] as const)(
    '%s区間の駅番号に対応するカラー・白黒画像を選ぶ',
    (symbol, number, color, gray) => {
      const { result } = renderHook(useGetLineMark);
      const stationNumbers = [createStationNumber(symbol, number)];
      expect(result.current({ line, stationNumbers })).toMatchObject({
        sign: symbol,
        signPath: color,
      });
      expect(
        result.current({ line, stationNumbers, shouldGrayscale: true })
      ).toMatchObject({
        sign: symbol,
        signPath: gray,
      });
    }
  );

  it('他路線の駅番号が先頭でも対象路線の記号と画像を選ぶ', () => {
    const { result } = renderHook(useGetLineMark);
    const stationNumbers = [
      createStationNumber('G', 'G-19'),
      createStationNumber('TI', 'TI-25'),
    ];
    expect(result.current({ line, stationNumbers })).toMatchObject({
      sign: 'TI',
      signPath: 11,
    });
  });
});

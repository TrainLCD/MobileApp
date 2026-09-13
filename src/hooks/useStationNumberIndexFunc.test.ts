import { renderHook } from '@testing-library/react-native';
import type { LineSymbol } from '~/@types/graphql';
import {
  createLine,
  createStation,
  createStationNumber,
} from '~/utils/test/factories';
import { useStationNumberIndexFunc } from './useStationNumberIndexFunc';

const createLineSymbol = (symbol: string): LineSymbol => ({
  __typename: 'LineSymbol',
  color: '#123456',
  shape: 'ROUND',
  symbol,
});

describe('useStationNumberIndexFunc', () => {
  it('lineを渡さない場合は先頭の駅番号を指す', () => {
    const { result } = renderHook(() => useStationNumberIndexFunc());
    const station = createStation(1, {
      stationNumbers: [
        createStationNumber('TS', 'TS-30'),
        createStationNumber('TI', 'TI-10'),
      ],
    });

    expect(result.current(station)).toBe(0);
  });

  it('路線の記号に一致する駅番号の位置を返す', () => {
    const { result } = renderHook(() => useStationNumberIndexFunc());
    const station = createStation(1, {
      stationNumbers: [
        createStationNumber('JY', 'JY-01'),
        createStationNumber('JK', 'JK-26'),
      ],
    });
    const line = createLine(1, { lineSymbols: [createLineSymbol('JK')] });

    expect(result.current(station, line)).toBe(1);
  });

  // 東武スカイツリーラインの lineSymbols は [TI, TS] だが、東武動物公園の
  // stationNumbers は [TS-30] のみ。lineSymbols 側の位置(1)を返すと存在しない
  // 駅番号を引いてナンバリングが消えるため、stationNumbers 側の位置を返す。
  it('lineSymbolsとstationNumbersの数が揃っていなくても駅番号を引ける', () => {
    const { result } = renderHook(() => useStationNumberIndexFunc());
    const station = createStation(1, {
      stationNumbers: [createStationNumber('TS', 'TS-30')],
    });
    const line = createLine(1, {
      lineSymbols: [createLineSymbol('TI'), createLineSymbol('TS')],
    });

    expect(result.current(station, line)).toBe(0);
  });

  it('一致する記号がない場合は先頭の駅番号にフォールバックする', () => {
    const { result } = renderHook(() => useStationNumberIndexFunc());
    const station = createStation(1, {
      stationNumbers: [createStationNumber('TS', 'TS-30')],
    });
    const line = createLine(1, { lineSymbols: [createLineSymbol('H')] });

    expect(result.current(station, line)).toBe(0);
  });

  it('駅番号がない場合は0を返す', () => {
    const { result } = renderHook(() => useStationNumberIndexFunc());
    const station = createStation(1, { stationNumbers: [] });
    const line = createLine(1, { lineSymbols: [createLineSymbol('H')] });

    expect(result.current(station, line)).toBe(0);
    expect(result.current(undefined, line)).toBe(0);
  });
});

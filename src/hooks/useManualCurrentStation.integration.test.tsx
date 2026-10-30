import { act, renderHook } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import type React from 'react';
import { selectedLineAtom } from '~/store/atoms/line';
import {
  selectedBoundAtom,
  stationAtom,
  stationsAtom,
} from '~/store/atoms/station';
import { createLine, createStation } from '~/utils/test/factories';
import { useCurrentLine } from './useCurrentLine';
import { useGraphQLQuery } from './useGraphQLQuery';
import { useManualCurrentStation } from './useManualCurrentStation';

jest.mock('./useGraphQLQuery', () => ({ useGraphQLQuery: jest.fn() }));

it('経路外の駅を指定した後も現在路線と全駅の候補を維持する', () => {
  const a = createStation(1);
  const b = createStation(2);
  const outside = createStation(3);
  const store = createStore();
  store.set(selectedLineAtom, createLine(1));
  store.set(stationsAtom, [a, b]);
  store.set(stationAtom, a);
  store.set(selectedBoundAtom, b);
  jest.mocked(useGraphQLQuery).mockReturnValue({
    data: { lineStations: [a, b, outside] },
    loading: false,
    error: undefined,
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  const { result } = renderHook(
    () => ({
      ...useManualCurrentStation(),
      currentLine: useCurrentLine(),
    }),
    { wrapper }
  );
  act(() => result.current.selectStation(outside));
  expect(store.get(stationAtom)).toBe(outside);
  expect(result.current.currentLine?.id).toBe(1);
  expect(result.current.selectableStations).toEqual([a, b, outside]);
  expect(useGraphQLQuery).toHaveBeenLastCalledWith(expect.anything(), {
    variables: { lineId: 1 },
    skip: false,
  });
  act(() => store.set(selectedLineAtom, null));
  expect(result.current.currentLine).toBeNull();
  expect(result.current.selectableStations).toEqual([]);
});

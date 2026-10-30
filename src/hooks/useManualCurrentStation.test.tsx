import { act, renderHook } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import type React from 'react';
import { StopCondition } from '~/@types/graphql';
import { GET_LINE_LIST_STATIONS } from '~/lib/graphql/queries';
import { etaAnchorAtom } from '~/store/atoms/etaFallback';
import { manualStationCorrectionAtom } from '~/store/atoms/manualStationCorrection';
import { stationForHeaderAtom, trainTypeAtom } from '~/store/atoms/navigation';
import { resetFirstSpeechAtom } from '~/store/atoms/speech';
import {
  approachingAtom,
  arrivedAtom,
  selectedBoundAtom,
  selectedDirectionAtom,
  stationAtom,
  stationsAtom,
} from '~/store/atoms/station';
import { createLine, createStation } from '~/utils/test/factories';
import { useCurrentLine } from './useCurrentLine';
import { useGraphQLQuery } from './useGraphQLQuery';
import { useManualCurrentStation } from './useManualCurrentStation';

jest.mock('./useCurrentLine', () => ({ useCurrentLine: jest.fn() }));
jest.mock('./useGraphQLQuery', () => ({ useGraphQLQuery: jest.fn() }));
const a = createStation(1);
const b = createStation(2, { stopCondition: StopCondition.Not });
const other = createStation(3, { line: { id: 2 } });
const duplicateGroup = createStation(4, { groupId: a.groupId });
const outsideRoute = createStation(5);
const setup = () => {
  const store = createStore();
  store.set(stationsAtom, [a, b, other, duplicateGroup]);
  store.set(stationAtom, a);
  store.set(selectedBoundAtom, b);
  store.set(selectedDirectionAtom, 'OUTBOUND');
  store.set(arrivedAtom, false);
  store.set(approachingAtom, true);
  jest.mocked(useCurrentLine).mockReturnValue(createLine(1));
  jest.mocked(useGraphQLQuery).mockReturnValue({
    data: {
      lineListStations: [
        a,
        { ...b, stopCondition: StopCondition.All },
        duplicateGroup,
        outsideRoute,
        other,
      ],
    },
    loading: false,
    error: undefined,
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return { store, ...renderHook(useManualCurrentStation, { wrapper }) };
};

afterEach(() => jest.clearAllMocks());

it('直通経路の各路線の全駅を返し、経路上の通過情報と同一groupIdの別駅を残す', () => {
  expect(setup().result.current.selectableStations).toEqual([
    a,
    b,
    duplicateGroup,
    outsideRoute,
    other,
  ]);
});

it('現在駅とヘッダーを補正し、種別・方向・行き先・走行状態を維持する', () => {
  const { store, result } = setup();
  const trainType = store.get(trainTypeAtom);
  store.set(etaAnchorAtom, {
    stationId: 1,
    kind: 'DEPARTED',
    observedAtMs: 1,
  });
  act(() => result.current.selectStation(b));
  expect(store.get(stationAtom)).toBe(b);
  expect(store.get(manualStationCorrectionAtom)?.station).toBe(b);
  expect(store.get(etaAnchorAtom)).toBeNull();
  expect(store.get(stationForHeaderAtom)).toBe(b);
  expect(store.get(approachingAtom)).toBe(false);
  expect(store.get(arrivedAtom)).toBe(false);
  expect(store.get(selectedDirectionAtom)).toBe('OUTBOUND');
  expect(store.get(selectedBoundAtom)).toBe(b);
  expect(store.get(trainTypeAtom)).toBe(trainType);
  expect(store.get(resetFirstSpeechAtom)).toBe(1);
});

it('経路が変更されて一覧の駅がなくなった場合は補正しない', () => {
  const { store, result } = setup();
  const selectStation = result.current.selectStation;
  act(() => store.set(stationsAtom, [other]));
  act(() => selectStation(b));
  expect(store.get(stationAtom)).toBe(a);
});

it('列車種別の経路にない駅も選べて運行経路を維持する', () => {
  const { store, result } = setup();
  const route = store.get(stationsAtom);
  act(() => result.current.selectStation(outsideRoute));
  expect(store.get(stationAtom)).toBe(outsideRoute);
  expect(store.get(stationForHeaderAtom)).toBe(outsideRoute);
  expect(store.get(stationsAtom)).toBe(route);
  expect(store.get(manualStationCorrectionAtom)?.stations).toBe(route);
  expect(store.get(selectedBoundAtom)).toBe(b);
  expect(store.get(selectedDirectionAtom)).toBe('OUTBOUND');
});

it('全駅の取得中や取得失敗時にも既存経路の駅を選べる', () => {
  const { result, rerender } = setup();
  jest.mocked(useGraphQLQuery).mockReturnValue({
    data: undefined,
    loading: false,
    error: new Error('offline'),
  });
  rerender({});
  expect(result.current.selectableStations).toEqual([
    a,
    b,
    other,
    duplicateGroup,
  ]);
});

it('別路線の取得結果や一覧にない駅では補正しない', () => {
  const { store, result, rerender } = setup();
  const unrelated = createStation(99, { line: { id: 99 } });
  jest.mocked(useGraphQLQuery).mockReturnValue({
    data: { lineListStations: [a, unrelated] },
    loading: false,
    error: undefined,
  });
  rerender({});
  expect(result.current.selectableStations).toEqual([a]);
  act(() => result.current.selectStation(unrelated));
  expect(store.get(stationAtom)).toBe(a);
});

it('走行を終了した場合は一覧を空にし、補正しない', () => {
  const { store, result } = setup();
  act(() => store.set(selectedBoundAtom, null));
  expect(result.current.selectableStations).toEqual([]);
  act(() => result.current.selectStation(b));
  expect(store.get(stationAtom)).toBe(a);
});

it('種別で絞らないAPIへ直通経路の路線IDを重複なく渡す', () => {
  setup();
  expect(useGraphQLQuery).toHaveBeenLastCalledWith(GET_LINE_LIST_STATIONS, {
    variables: { lineIds: [1, 2] },
    skip: false,
  });
});

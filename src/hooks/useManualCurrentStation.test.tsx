import { act, renderHook } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import type React from 'react';
import { StopCondition } from '~/@types/graphql';
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
import { useManualCurrentStation } from './useManualCurrentStation';

jest.mock('./useCurrentLine', () => ({ useCurrentLine: jest.fn() }));
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
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return { store, ...renderHook(useManualCurrentStation, { wrapper }) };
};

afterEach(() => jest.clearAllMocks());

it('確定済みの経路をそのまま返し、直通先・通過駅・同一groupIdの別駅を残す', () => {
  const { store, result } = setup();
  expect(result.current.selectableStations).toBe(store.get(stationsAtom));
  expect(result.current.selectableStations).toEqual([
    a,
    b,
    other,
    duplicateGroup,
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

it('経路外の駅では補正しない', () => {
  const { store, result } = setup();
  const route = store.get(stationsAtom);
  act(() => result.current.selectStation(outsideRoute));
  expect(store.get(stationAtom)).toBe(a);
  expect(store.get(stationsAtom)).toBe(route);
  expect(store.get(manualStationCorrectionAtom)).toBeNull();
});

it('別路線にある経路上の駅も選べる', () => {
  const { store, result } = setup();
  act(() => result.current.selectStation(other));
  expect(store.get(stationAtom)).toBe(other);
  expect(store.get(stationForHeaderAtom)).toBe(other);
});

it('路線の選択を解除すると候補を空にする', () => {
  const { result, rerender } = setup();
  jest.mocked(useCurrentLine).mockReturnValue(null);
  rerender({});
  expect(result.current.selectableStations).toEqual([]);
});

it('走行を終了した場合は一覧を空にし、補正しない', () => {
  const { store, result } = setup();
  act(() => store.set(selectedBoundAtom, null));
  expect(result.current.selectableStations).toEqual([]);
  act(() => result.current.selectStation(b));
  expect(store.get(stationAtom)).toBe(a);
});

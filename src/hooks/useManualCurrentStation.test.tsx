import { act, renderHook } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import type React from 'react';
import { StopCondition } from '~/@types/graphql';
import { etaAnchorAtom } from '~/store/atoms/etaFallback';
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

it('現在路線の駅だけを返し、通過駅と同一groupIdの別駅を残す', () => {
  expect(setup().result.current.selectableStations).toEqual([
    a,
    b,
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
  act(() => store.set(stationsAtom, [other]));
  act(() => result.current.selectStation(b));
  expect(store.get(stationAtom)).toBe(a);
});

it('走行を終了した場合は一覧を空にし、補正しない', () => {
  const { store, result } = setup();
  act(() => store.set(selectedBoundAtom, null));
  expect(result.current.selectableStations).toEqual([]);
  act(() => result.current.selectStation(b));
  expect(store.get(stationAtom)).toBe(a);
});

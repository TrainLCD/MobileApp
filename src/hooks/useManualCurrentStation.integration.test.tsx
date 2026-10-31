import { act, renderHook } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import type React from 'react';
import { StopCondition } from '~/@types/graphql';
import { gqlRequest } from '~/lib/gql';
import { selectedLineAtom } from '~/store/atoms/line';
import {
  selectedBoundAtom,
  selectedDirectionAtom,
  stationAtom,
  stationsAtom,
} from '~/store/atoms/station';
import { createLine, createStation } from '~/utils/test/factories';
import { useManualCurrentStation } from './useManualCurrentStation';
import { usePresetStops } from './usePresetStops';

jest.mock('~/lib/gql', () => ({ gqlRequest: jest.fn() }));
afterEach(() => jest.clearAllMocks());

it.each(['INBOUND', 'OUTBOUND'] as const)(
  '%s: 福生～布佐の確定区間だけを表示し、区間内の通過駅は残す',
  (direction) => {
    // IDと並びは区間境界を検証するためのテスト用データ。
    const outsideStart = createStation(1, { name: '牛浜', line: { id: 1 } });
    const fussa = createStation(2, { name: '福生', line: { id: 1 } });
    const pass = createStation(3, {
      name: '区間内の通過駅',
      line: { id: 1 },
      stopCondition: StopCondition.Not,
    });
    const through = createStation(4, { name: '直通先の駅', line: { id: 2 } });
    const fusa = createStation(5, { name: '布佐', line: { id: 2 } });
    const outsideEnd = createStation(6, { name: '下総松崎', line: { id: 2 } });
    const fullLine = [outsideStart, fussa, pass, through, fusa, outsideEnd];
    const ordered =
      direction === 'INBOUND' ? fullLine : [...fullLine].reverse();
    // 経路確定画面と同じフックで保存した起点・行き先の区間を切り出す。
    const preset = renderHook(() =>
      usePresetStops({
        savedRouteDirection: direction,
        savedRouteOriginStationId: fussa.groupId,
        stations: ordered,
        wantedDestination: fusa,
        confirmedStation: fussa,
      })
    );
    const route = preset.result.current.presetStops;
    if (!route) throw new Error('起点から行き先までの経路が必要です');
    const expected =
      direction === 'INBOUND'
        ? [fussa, pass, through, fusa]
        : [fusa, through, pass, fussa];
    expect(route).toEqual(expected);
    const store = createStore();
    store.set(selectedLineAtom, createLine(1));
    store.set(stationsAtom, route);
    store.set(stationAtom, fussa);
    store.set(selectedBoundAtom, fusa);
    store.set(selectedDirectionAtom, direction);
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const { result, unmount } = renderHook(useManualCurrentStation, {
      wrapper,
    });
    expect(result.current.selectableStations).toBe(route);
    expect(result.current.selectableStations).toEqual(expected);
    expect(result.current.selectableStations).not.toContain(outsideStart);
    expect(result.current.selectableStations).not.toContain(outsideEnd);
    // 進行・手動指定で現在駅が移っても、候補の起点と行き先を変えない。
    for (const station of [pass, through, fussa]) {
      act(() => result.current.selectStation(station));
      expect(store.get(stationAtom)).toBe(station);
      expect(result.current.selectableStations).toBe(route);
      expect(store.get(selectedBoundAtom)).toBe(fusa);
      expect(store.get(selectedDirectionAtom)).toBe(direction);
    }
    for (const station of [outsideStart, outsideEnd]) {
      act(() => result.current.selectStation(station));
      expect(store.get(stationAtom)).toBe(fussa);
    }
    expect(gqlRequest).not.toHaveBeenCalled();
    unmount();
    preset.unmount();
  }
);

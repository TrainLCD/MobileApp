import { act, renderHook } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import type React from 'react';
import { StopCondition } from '~/@types/graphql';
import { createStation } from '~/utils/test/factories';
import { APP_THEME } from '../models/Theme';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { themePreferenceAtom } from '../store/atoms/theme';
import { useRefreshLeftStations } from './useRefreshLeftStations';

// 10駅の直線路線。2駅目と4駅目が通過駅。
// INBOUND(配列順方向)で1駅目に停車中の状態を基本とする。
const PASS_STATION_IDS = [2, 4];
const stations = Array.from({ length: 10 }, (_, i) =>
  createStation(i + 1, {
    stopCondition: PASS_STATION_IDS.includes(i + 1)
      ? StopCondition.Not
      : StopCondition.All,
  })
);

const ALL_IDS = stations.map((s) => s.id as number);
const STOP_IDS = ALL_IDS.filter((id) => !PASS_STATION_IDS.includes(id));

const renderWithStore = (theme: (typeof APP_THEME)[keyof typeof APP_THEME]) => {
  const store = createStore();
  store.set(themePreferenceAtom, theme);
  store.set(stationState, (prev) => ({
    ...prev,
    station: stations[0],
    stations,
    selectedDirection: 'INBOUND' as const,
  }));

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  const utils = renderHook(() => useRefreshLeftStations(), { wrapper });

  return { store, ...utils };
};

const getLeftStationIds = (store: ReturnType<typeof createStore>) =>
  store.get(navigationState).leftStations.map((s) => s.id);

describe('useRefreshLeftStations', () => {
  it('通常テーマでは通過駅を含む全駅をleftStationsにセットする', () => {
    const { store } = renderWithStore(APP_THEME.TOKYO_METRO);

    expect(getLeftStationIds(store)).toEqual(ALL_IDS);
  });

  it.each([APP_THEME.JR_WEST, APP_THEME.LED])(
    '%sテーマを最初から選択している場合は通過駅を除外したleftStationsをセットする',
    (theme) => {
      const { store } = renderWithStore(theme);

      expect(getLeftStationIds(store)).toEqual(STOP_IDS);
    }
  );

  it('走行中にテーマをJR西日本風へ切り替えるとleftStationsから通過駅が除外される', () => {
    const { store } = renderWithStore(APP_THEME.TOKYO_METRO);
    expect(getLeftStationIds(store)).toEqual(ALL_IDS);

    // 先頭駅(=現在停車駅)は変わらないままテーマだけ切り替わるケース。
    // 以前は先頭駅のgroupId比較しかしておらず、古い未フィルタのリストが残っていた。
    act(() => {
      store.set(themePreferenceAtom, APP_THEME.JR_WEST);
    });

    expect(getLeftStationIds(store)).toEqual(STOP_IDS);
  });

  it('テーマをJR西日本風から通常テーマへ戻すと通過駅が復活する', () => {
    const { store } = renderWithStore(APP_THEME.JR_WEST);
    expect(getLeftStationIds(store)).toEqual(STOP_IDS);

    act(() => {
      store.set(themePreferenceAtom, APP_THEME.TOKYO_METRO);
    });

    expect(getLeftStationIds(store)).toEqual(ALL_IDS);
  });

  it('リストの中身が変わらない更新ではleftStationsの参照を維持する', () => {
    const { store } = renderWithStore(APP_THEME.JR_WEST);
    const before = store.get(navigationState).leftStations;

    // JR_WEST→LEDはどちらも通過駅除外のため内容が同一。
    // フィルタ配列の参照は変わるが、内容が同じならprevを返して再レンダーを抑制する。
    act(() => {
      store.set(themePreferenceAtom, APP_THEME.LED);
    });

    expect(store.get(navigationState).leftStations).toBe(before);
  });

  it('JR西日本風テーマでは通過駅を通過中でもleftStationsを更新しない', () => {
    const { store } = renderWithStore(APP_THEME.JR_WEST);
    const before = store.get(navigationState).leftStations;

    // 現在駅が通過駅(2駅目)になっても、直前の停車駅(1駅目)基準のまま維持される
    act(() => {
      store.set(stationState, (prev) => ({
        ...prev,
        station: stations[1],
      }));
    });

    expect(store.get(navigationState).leftStations).toBe(before);
    expect(getLeftStationIds(store)).toEqual(STOP_IDS);
  });

  it('通常テーマでは次の駅へ進むとleftStationsが先へ進む', () => {
    const { store } = renderWithStore(APP_THEME.TOKYO_METRO);

    act(() => {
      store.set(stationState, (prev) => ({
        ...prev,
        station: stations[1],
      }));
    });

    expect(getLeftStationIds(store)).toEqual(ALL_IDS.slice(1));
  });
});

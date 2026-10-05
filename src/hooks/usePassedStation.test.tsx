import { renderHook } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import type React from 'react';
import { StopCondition } from '~/@types/graphql';
import { locationAtom } from '~/store/atoms/location';
import {
  selectedDirectionAtom,
  stationAtom,
  stationsAtom,
} from '~/store/atoms/station';
import { createStation } from '~/utils/test/factories';
import { useLoopLine } from './useLoopLine';
import { usePassedStation } from './usePassedStation';

jest.mock('./useLoopLine', () => ({
  useLoopLine: jest.fn(),
}));

const mockUseLoopLine = useLoopLine as jest.MockedFunction<typeof useLoopLine>;

// 東海道新幹線は東京起点の並び。三島→新横浜は上り(OUTBOUNDで逆順に辿る)。
const shinYokohama = createStation(100203, {
  latitude: 35.5069,
  longitude: 139.6175,
});
const odawara = createStation(100204, {
  latitude: 35.2564,
  longitude: 139.1552,
  stopCondition: StopCondition.Not,
});
const atami = createStation(100205, {
  latitude: 35.1036,
  longitude: 139.0779,
  stopCondition: StopCondition.Not,
});
const mishima = createStation(100206, {
  latitude: 35.1265,
  longitude: 138.9108,
});

const setup = (
  direction: 'INBOUND' | 'OUTBOUND',
  isLoopLine = false
): ReturnType<typeof usePassedStation> => {
  mockUseLoopLine.mockReturnValue({
    isLoopLine,
  } as ReturnType<typeof useLoopLine>);
  const store = createStore();
  store.set(stationsAtom, [shinYokohama, odawara, atami, mishima]);
  store.set(selectedDirectionAtom, direction);
  store.set(stationAtom, mishima);
  store.set(locationAtom, {
    timestamp: 0,
    coords: {
      latitude: 35.40113,
      longitude: 139.39607,
      accuracy: 7,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: 80,
    },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return renderHook(() => usePassedStation(), { wrapper }).result.current;
};

describe('usePassedStation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('進行方向順に並べ直して、通り過ぎた通過駅を返す', () => {
    expect(setup('OUTBOUND')?.id).toBe(odawara.id);
  });

  it('逆方向に乗っている扱いなら現在駅の先に区間が無く、何も返さない', () => {
    expect(setup('INBOUND')).toBeUndefined();
  });

  it('ループ線では何も返さない', () => {
    expect(setup('OUTBOUND', true)).toBeUndefined();
  });
});

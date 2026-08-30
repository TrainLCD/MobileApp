import { renderHook } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import type React from 'react';
import { type Station, StopCondition } from '~/@types/graphql';
import { arrivedAtom } from '~/store/atoms/station';
import { useCurrentStation } from './useCurrentStation';
import { useDisplayNextStation } from './useDisplayNextStation';
import { useTransferTargetStation } from './useTransferTargetStation';

jest.mock('./useCurrentStation', () => ({
  useCurrentStation: jest.fn(),
}));
jest.mock('./useDisplayNextStation', () => ({
  useDisplayNextStation: jest.fn(),
}));

const mockedUseCurrentStation = useCurrentStation as jest.Mock;
const mockedUseDisplayNextStation = useDisplayNextStation as jest.Mock;

const buildStation = (
  id: number,
  name: string,
  stopCondition: StopCondition
): Station => ({ id, groupId: id, name, stopCondition }) as unknown as Station;

const shinjuku = buildStation(1, '新宿', StopCondition.All);
const koenji = buildStation(2, '高円寺', StopCondition.Not);
const nakano = buildStation(3, '中野', StopCondition.All);

const renderWith = ({
  arrived,
  currentStation,
  nextStation,
}: {
  arrived: boolean;
  currentStation: Station | undefined;
  nextStation: Station | undefined;
}) => {
  const store = createStore();
  store.set(arrivedAtom, arrived);
  mockedUseCurrentStation.mockReturnValue(currentStation);
  mockedUseDisplayNextStation.mockReturnValue(nextStation);

  return renderHook(() => useTransferTargetStation(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    ),
  });
};

describe('useTransferTargetStation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('停車中で現在駅が停車駅なら現在駅を対象にする', () => {
    const { result } = renderWith({
      arrived: true,
      currentStation: shinjuku,
      nextStation: nakano,
    });

    expect(result.current).toBe(shinjuku);
  });

  it('到着扱いでも現在駅が通過駅なら次の駅を対象にする', () => {
    // 通過中の駅の乗換路線を案内してしまわないこと
    const { result } = renderWith({
      arrived: true,
      currentStation: koenji,
      nextStation: nakano,
    });

    expect(result.current).toBe(nakano);
  });

  it('未到着なら表示用の次駅(接近中はGPS基準の接近駅)を対象にする', () => {
    const { result } = renderWith({
      arrived: false,
      currentStation: shinjuku,
      nextStation: nakano,
    });

    expect(result.current).toBe(nakano);
  });

  it('現在駅が取れないときは次の駅へ倒す', () => {
    const { result } = renderWith({
      arrived: true,
      currentStation: undefined,
      nextStation: nakano,
    });

    expect(result.current).toBe(nakano);
  });
});

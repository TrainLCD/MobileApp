import { render, waitFor } from '@testing-library/react-native';
import type { Line, Station, TrainType } from '~/@types/graphql';
import { Text } from 'react-native';
import React from 'react';
import { useAtomValue } from 'jotai';
import { useCurrentTrainType } from './useCurrentTrainType';
import { useCurrentStation } from './useCurrentStation';
import { useCurrentLine } from './useCurrentLine';
import getIsPass from '../utils/isPass';
import stationState from '../store/atoms/station';
import navigationState from '../store/atoms/navigation';

jest.mock('jotai', () => ({
  __esModule: true,
  useAtomValue: jest.fn(),
  atom: jest.fn(),
}));
jest.mock('../store/atoms/station', () => ({
  __esModule: true,
  default: { __atom: 'station' },
}));
jest.mock('../store/atoms/navigation', () => ({
  __esModule: true,
  default: { __atom: 'navigation' },
}));
jest.mock('./useCurrentStation', () => ({
  useCurrentStation: jest.fn(),
}));
jest.mock('./useCurrentLine', () => ({
  useCurrentLine: jest.fn(),
}));
jest.mock('../utils/isPass', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const TestComponent: React.FC = () => {
  const trainType = useCurrentTrainType();
  return (
    <Text testID="trainType">{trainType ? trainType.typeId ?? '' : 'null'}</Text>
  );
};

const createLine = (overrides: Partial<Line> = {}): Line =>
  ({
    id: 'line-main',
    nameShort: 'Main',
    name: 'Main',
    ...overrides,
  } as Line);

const createTrainType = (overrides: Partial<TrainType> = {}): TrainType =>
  ({
    __typename: 'TrainType',
    typeId: 'local',
    name: 'Local',
    nameRoman: 'Local',
    color: '#fff',
    ...overrides,
  } as TrainType);

const createStation = (overrides: Partial<Station> = {}): Station =>
  ({
    __typename: 'Station',
    id: 1,
    groupId: 1,
    name: 'Shibuya',
    nameRoman: 'Shibuya',
    line: createLine(),
    trainType: null,
    ...overrides,
  } as Station);

describe('useCurrentTrainType', () => {
  const mockUseAtomValue = useAtomValue as jest.MockedFunction<
    typeof useAtomValue
  >;
  const mockUseCurrentStation =
    useCurrentStation as jest.MockedFunction<typeof useCurrentStation>;
  const mockUseCurrentLine =
    useCurrentLine as jest.MockedFunction<typeof useCurrentLine>;
  const mockGetIsPass = getIsPass as jest.MockedFunction<typeof getIsPass>;

  let stationAtomValue: { stations: Station[] };
  let navigationAtomValue: { trainType: TrainType | null };
  let currentStationValue: Station | null;
  let currentLineValue: Line | null;

  beforeEach(() => {
    jest.clearAllMocks();
    stationAtomValue = { stations: [] };
    navigationAtomValue = { trainType: null };
    currentStationValue = null;
    currentLineValue = createLine();
    mockUseAtomValue.mockImplementation((atom) => {
      if (atom === stationState) {
        return stationAtomValue;
      }
      if (atom === navigationState) {
        return navigationAtomValue;
      }
      throw new Error('unknown atom');
    });
    mockUseCurrentStation.mockImplementation(() => currentStationValue);
    mockUseCurrentLine.mockImplementation(() => currentLineValue);
    mockGetIsPass.mockReturnValue(false);
  });

  it('現在駅の種別をそのまま返す', () => {
    const stationTrainType = createTrainType({ typeId: 'rapid' });
    currentStationValue = createStation({
      line: createLine({ id: 'line-a' }),
      trainType: stationTrainType,
    });
    currentLineValue = createLine({ id: 'line-a' });
    navigationAtomValue.trainType = createTrainType({ typeId: 'local' });

    const { getByTestId } = render(<TestComponent />);

    expect(getByTestId('trainType').props.children).toBe('rapid');
  });

  it('現在の路線が異なるとき stations の種別に同期する', async () => {
    const actualTrainType = createTrainType({ typeId: 'express' });
    currentStationValue = createStation({
      line: createLine({ id: 'line-a' }),
      trainType: createTrainType({ typeId: 'rapid' }),
    });
    const throughStation = createStation({
      id: 200,
      line: createLine({ id: 'line-b' }),
      trainType: actualTrainType,
    });
    stationAtomValue = { stations: [throughStation] };
    currentLineValue = createLine({ id: 'line-b', station: { id: 200 } as any });

    const { getByTestId } = render(<TestComponent />);

    await waitFor(() =>
      expect(getByTestId('trainType').props.children).toBe('express')
    );
  });

  it('navigationState の trainType が null になるとキャッシュをクリアする', async () => {
    const passStation = createStation({
      line: createLine({ id: 'line-a' }),
      trainType: null,
    });
    currentStationValue = passStation;
    currentLineValue = passStation.line as Line;
    navigationAtomValue.trainType = createTrainType({ typeId: 'rapid' });
    mockGetIsPass.mockReturnValue(true);

    const screen = render(<TestComponent />);
    expect(mockUseAtomValue).toHaveBeenCalledWith(navigationState);
    expect(screen.getByTestId('trainType').props.children).toBe('rapid');

    navigationAtomValue.trainType = null;
    screen.rerender(<TestComponent />);

    await waitFor(() =>
      expect(screen.getByTestId('trainType').props.children).toBe('null')
    );
  });

  it('通過駅では前回の種別を維持する', () => {
    const baseStation = createStation({
      line: createLine({ id: 'line-a' }),
      trainType: createTrainType({ typeId: 'rapid' }),
    });
    const passStation = createStation({
      id: 2,
      line: createLine({ id: 'line-a' }),
      trainType: createTrainType({ typeId: 'express' }),
    });
    currentStationValue = baseStation;
    currentLineValue = baseStation.line as Line;
    navigationAtomValue.trainType = createTrainType({ typeId: 'rapid' });
    mockGetIsPass.mockImplementation((station) => station?.id === passStation.id);

    const screen = render(<TestComponent />);
    expect(screen.getByTestId('trainType').props.children).toBe('rapid');

    currentStationValue = passStation;
    currentLineValue = passStation.line as Line;
    screen.rerender(<TestComponent />);

    expect(screen.getByTestId('trainType').props.children).toBe('rapid');
  });
});

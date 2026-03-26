import { useLazyQuery } from '@apollo/client/react';
import { act, render } from '@testing-library/react-native';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import type React from 'react';
import type { Line, Station, TrainType } from '~/@types/graphql';
import { StopCondition } from '~/@types/graphql';
import { createLine, createStation } from '~/utils/test/factories';
import { useCurrentLine } from './useCurrentLine';
import { useCurrentStation } from './useCurrentStation';
import { useTrainTypeModal } from './useTrainTypeModal';

jest.mock('react-native-device-info', () => ({
  getBundleId: jest.fn(() => 'com.test'),
}));

jest.mock('@apollo/client/react', () => ({
  useLazyQuery: jest.fn(),
}));

jest.mock('jotai', () => ({
  __esModule: true,
  useAtom: jest.fn(),
  useAtomValue: jest.fn(),
  useSetAtom: jest.fn(() => jest.fn()),
  atom: jest.fn(),
}));

jest.mock('./useCurrentLine', () => ({
  useCurrentLine: jest.fn(),
}));

jest.mock('./useCurrentStation', () => ({
  useCurrentStation: jest.fn(),
}));

jest.mock('../translation', () => ({
  isJapanese: true,
}));

jest.mock('../store/atoms/station', () => ({
  __esModule: true,
  default: Symbol('stationState'),
}));

jest.mock('../store/atoms/navigation', () => ({
  __esModule: true,
  default: Symbol('navigationState'),
}));

jest.mock('../store/atoms/line', () => ({
  __esModule: true,
  default: Symbol('lineState'),
}));

jest.mock('../store/atoms/speech', () => ({
  __esModule: true,
  default: Symbol('speechState'),
  resetFirstSpeechAtom: Symbol('resetFirstSpeechAtom'),
}));

jest.mock('~/lib/graphql/queries', () => ({
  GET_LINE_GROUP_STATIONS: Symbol('GET_LINE_GROUP_STATIONS'),
  GET_STATION_TRAIN_TYPES_LIGHT: Symbol('GET_STATION_TRAIN_TYPES_LIGHT'),
}));

jest.mock('~/utils/findNearestStation', () => ({
  findNearestStation: jest.fn(),
}));

const mockUseLazyQuery = useLazyQuery as unknown as jest.Mock;
const mockUseAtom = useAtom as unknown as jest.Mock;
const mockUseAtomValue = useAtomValue as jest.MockedFunction<
  typeof useAtomValue
>;
const mockUseSetAtom = useSetAtom as unknown as jest.Mock;
const mockUseCurrentLine = useCurrentLine as jest.MockedFunction<
  typeof useCurrentLine
>;
const mockUseCurrentStation = useCurrentStation as jest.MockedFunction<
  typeof useCurrentStation
>;

type HookResult = ReturnType<typeof useTrainTypeModal> | null;

const HookBridge: React.FC<{ onReady: (value: HookResult) => void }> = ({
  onReady,
}) => {
  onReady(useTrainTypeModal());
  return null;
};

const createTrainType = (
  id: number,
  overrides: Partial<TrainType> = {}
): TrainType => ({
  __typename: 'TrainType',
  color: '#ff0000',
  direction: null,
  groupId: id,
  id,
  kind: null,
  line: null,
  lines: null,
  name: `TrainType${id}`,
  nameChinese: null,
  nameIpa: null,
  nameKatakana: `トレインタイプ${id}`,
  nameKorean: null,
  nameRoman: `TrainType${id}`,
  nameRomanIpa: null,
  nameTtsSegments: null,
  typeId: id,
  ...overrides,
});

describe('useTrainTypeModal', () => {
  let mockFetchStationsByLineGroupId: jest.Mock;
  let mockFetchTrainTypes: jest.Mock;
  let mockSetStationState: jest.Mock;
  let mockSetNavigation: jest.Mock;
  let mockSetResetFirstSpeech: jest.Mock;

  const selectedLine = createLine(1, { nameShort: 'JR Central' });
  const currentLineValue = createLine(2, { nameShort: 'Metro' });

  const defaultStoppingStation = createStation(1);

  const setupMocks = (
    options: {
      stationStateValue?: {
        selectedBound: Station;
        station: Station;
        selectedDirection: 'INBOUND' | 'OUTBOUND';
      };
      lineStateValue?: { selectedLine: Line };
      navigationStateValue?: {
        fetchedTrainTypes: TrainType[];
        trainType: TrainType | null;
      };
      currentLine?: Line | null;
      currentStoppingStation?: Station | undefined;
    } = {}
  ) => {
    const {
      stationStateValue = {
        selectedBound: createStation(100),
        station: createStation(1),
        selectedDirection: 'INBOUND' as const,
      },
      lineStateValue = { selectedLine },
      navigationStateValue = {
        fetchedTrainTypes: [createTrainType(1), createTrainType(2)],
        trainType: createTrainType(1),
      },
      currentLine = currentLineValue as Line | null,
    } = options;
    const currentStoppingStation =
      'currentStoppingStation' in options
        ? options.currentStoppingStation
        : defaultStoppingStation;
    mockFetchStationsByLineGroupId = jest.fn();
    mockFetchTrainTypes = jest.fn();
    mockSetStationState = jest.fn();
    mockSetNavigation = jest.fn();
    mockSetResetFirstSpeech = jest.fn();

    const stationAtom = require('../store/atoms/station').default;
    const navigationAtom = require('../store/atoms/navigation').default;

    mockUseAtom.mockImplementation((atom: unknown) => {
      if (atom === stationAtom) {
        return [stationStateValue, mockSetStationState];
      }
      if (atom === navigationAtom) {
        return [navigationStateValue, mockSetNavigation];
      }
      return [undefined, jest.fn()];
    });

    mockUseAtomValue.mockReturnValue(lineStateValue);
    mockUseSetAtom.mockReturnValue(mockSetResetFirstSpeech);

    const lineGroupQuery =
      require('~/lib/graphql/queries').GET_LINE_GROUP_STATIONS;
    const trainTypesQuery =
      require('~/lib/graphql/queries').GET_STATION_TRAIN_TYPES_LIGHT;

    mockUseLazyQuery.mockImplementation((query: unknown) => {
      if (query === lineGroupQuery) {
        return [mockFetchStationsByLineGroupId, { loading: false }];
      }
      if (query === trainTypesQuery) {
        return [mockFetchTrainTypes, { loading: false }];
      }
      return [jest.fn(), { loading: false }];
    });

    mockUseCurrentLine.mockReturnValue(currentLine);
    mockUseCurrentStation.mockReturnValue(currentStoppingStation);
  };

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('handleTrainTypePress で停車駅のIDを使って列車種別を取得する', async () => {
    const stoppingStation = createStation(10);
    setupMocks({ currentStoppingStation: stoppingStation });

    const newTrainTypes = [createTrainType(3), createTrainType(4)];
    mockFetchTrainTypes.mockResolvedValue({
      data: { stationTrainTypes: newTrainTypes },
    });

    const hookRef: { current: HookResult } = { current: null };
    render(
      <HookBridge
        onReady={(v) => {
          hookRef.current = v;
        }}
      />
    );

    await act(async () => {
      hookRef.current?.handleTrainTypePress();
    });

    expect(mockFetchTrainTypes).toHaveBeenCalledWith({
      variables: { stationId: 10 },
    });
    expect(mockSetNavigation).toHaveBeenCalledWith(expect.any(Function));
  });

  it('handleTrainTypePress で通過駅ではなく直近の停車駅を使う', async () => {
    const passStation = createStation(5, {
      stopCondition: StopCondition.Not,
    });
    const stoppingStation = createStation(3);

    // useCurrentStation(true) は通過駅をスキップして停車駅を返す
    setupMocks({
      stationStateValue: {
        selectedBound: createStation(100),
        station: passStation,
        selectedDirection: 'INBOUND' as const,
      },
      currentStoppingStation: stoppingStation,
    });

    mockFetchTrainTypes.mockResolvedValue({
      data: { stationTrainTypes: [createTrainType(1)] },
    });

    const hookRef: { current: HookResult } = { current: null };
    render(
      <HookBridge
        onReady={(v) => {
          hookRef.current = v;
        }}
      />
    );

    await act(async () => {
      hookRef.current?.handleTrainTypePress();
    });

    // 通過駅(id:5)ではなく停車駅(id:3)でフェッチされること
    expect(mockFetchTrainTypes).toHaveBeenCalledWith({
      variables: { stationId: 3 },
    });
  });

  it('handleTrainTypePress で停車駅がない場合はフェッチしない', () => {
    setupMocks({ currentStoppingStation: undefined });

    const hookRef: { current: HookResult } = { current: null };
    render(
      <HookBridge
        onReady={(v) => {
          hookRef.current = v;
        }}
      />
    );

    hookRef.current?.handleTrainTypePress();

    expect(mockFetchTrainTypes).not.toHaveBeenCalled();
  });

  it('handleTrainTypePress でフェッチ結果が空の場合はfetchedTrainTypesを更新しない', async () => {
    setupMocks({ currentStoppingStation: createStation(10) });

    mockFetchTrainTypes.mockResolvedValue({
      data: { stationTrainTypes: [] },
    });

    const hookRef: { current: HookResult } = { current: null };
    render(
      <HookBridge
        onReady={(v) => {
          hookRef.current = v;
        }}
      />
    );

    await act(async () => {
      hookRef.current?.handleTrainTypePress();
    });

    expect(mockFetchTrainTypes).toHaveBeenCalled();
    expect(mockSetNavigation).not.toHaveBeenCalled();
  });

  it('trainTypeModalLine は currentLine を selectedLine より優先する', () => {
    setupMocks({ currentLine: currentLineValue });

    const hookRef: { current: HookResult } = { current: null };
    render(
      <HookBridge
        onReady={(v) => {
          hookRef.current = v;
        }}
      />
    );

    expect(hookRef.current?.trainTypeModalLine).toBe(currentLineValue);
  });

  it('trainTypeModalLine は currentLine が null の場合 selectedLine にフォールバックする', () => {
    setupMocks({ currentLine: null });

    const hookRef: { current: HookResult } = { current: null };
    render(
      <HookBridge
        onReady={(v) => {
          hookRef.current = v;
        }}
      />
    );

    expect(hookRef.current?.trainTypeModalLine).toBe(selectedLine);
  });

  it('useCurrentStation を skipPassStation=true で呼び出す', () => {
    setupMocks();

    render(<HookBridge onReady={() => {}} />);

    expect(mockUseCurrentStation).toHaveBeenCalledWith(true);
  });

  it('trainTypeDisabled は fetchedTrainTypes が1件以下の場合 true になる', () => {
    setupMocks({
      navigationStateValue: {
        fetchedTrainTypes: [createTrainType(1)],
        trainType: createTrainType(1),
      },
    });

    const hookRef: { current: HookResult } = { current: null };
    render(
      <HookBridge
        onReady={(v) => {
          hookRef.current = v;
        }}
      />
    );

    expect(hookRef.current?.trainTypeDisabled).toBe(true);
  });

  it('trainTypeDisabled は fetchedTrainTypes が2件以上の場合 false になる', () => {
    setupMocks();

    const hookRef: { current: HookResult } = { current: null };
    render(
      <HookBridge
        onReady={(v) => {
          hookRef.current = v;
        }}
      />
    );

    expect(hookRef.current?.trainTypeDisabled).toBe(false);
  });

  it('handleTrainTypeModalSelect で列車種別選択後にモーダルを閉じてstateを更新する', async () => {
    const trainType = createTrainType(5);
    const newStations = [createStation(10), createStation(11)];
    setupMocks();

    mockFetchStationsByLineGroupId.mockResolvedValue({
      data: { lineGroupStations: newStations },
    });

    const hookRef: { current: HookResult } = { current: null };
    render(
      <HookBridge
        onReady={(v) => {
          hookRef.current = v;
        }}
      />
    );

    await act(async () => {
      hookRef.current?.handleTrainTypeModalSelect(trainType);
    });

    expect(mockFetchStationsByLineGroupId).toHaveBeenCalledWith({
      variables: { lineGroupId: 5 },
    });
  });
});

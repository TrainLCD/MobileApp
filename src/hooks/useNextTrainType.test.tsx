import { render } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { Text } from 'react-native';
import type { Station, TrainType } from '~/@types/graphql';
import { createStation } from '~/utils/test/factories';
import type { LineDirection } from '../models/Bound';
import { selectedDirectionAtom, stationsAtom } from '../store/atoms/station';
import { useCurrentStation } from './useCurrentStation';
import { useCurrentTrainType } from './useCurrentTrainType';
import { useNextTrainType } from './useNextTrainType';

jest.mock('jotai', () => ({
  __esModule: true,
  useAtomValue: jest.fn(),
  atom: jest.fn(),
}));
jest.mock('../store/atoms/station', () => ({
  __esModule: true,
  stationsAtom: { __atom: 'stations' },
  selectedDirectionAtom: { __atom: 'selectedDirection' },
}));
jest.mock('./useCurrentStation', () => ({
  useCurrentStation: jest.fn(),
}));
jest.mock('./useCurrentTrainType', () => ({
  useCurrentTrainType: jest.fn(),
}));

const TestComponent: React.FC = () => {
  const nextTrainType = useNextTrainType();
  return (
    <Text testID="nextTrainType">
      {nextTrainType ? String(nextTrainType.typeId) : 'null'}
    </Text>
  );
};

const TRAIN_TYPE_IDS = { LOCAL: 1, EXPRESS: 2 } as const;

const createTrainType = (typeId: number, name: string): TrainType =>
  ({
    __typename: 'TrainTypeNested',
    color: '#00A0E9',
    direction: null,
    groupId: null,
    id: typeId,
    kind: null,
    line: null,
    lines: [],
    name,
    nameChinese: null,
    nameIpa: null,
    nameKatakana: name,
    nameKorean: null,
    nameRoman: name,
    nameRomanIpa: null,
    nameTtsSegments: null,
    typeId,
  }) as TrainType;

const localType = createTrainType(TRAIN_TYPE_IDS.LOCAL, '各駅停車');
const expressType = createTrainType(TRAIN_TYPE_IDS.EXPRESS, '急行');

const createStationWithType = (id: number, trainType: TrainType): Station =>
  createStation(id, { trainType } as Parameters<typeof createStation>[1]);

describe('useNextTrainType', () => {
  const mockUseAtomValue = useAtomValue as jest.MockedFunction<
    typeof useAtomValue
  >;
  const mockUseCurrentStation = useCurrentStation as jest.MockedFunction<
    typeof useCurrentStation
  >;
  const mockUseCurrentTrainType = useCurrentTrainType as jest.MockedFunction<
    typeof useCurrentTrainType
  >;

  // 浦和美園→海老名を模した、各駅停車→急行→各駅停車と種別が往復する経路
  const inboundStations = [
    createStationWithType(1, localType),
    createStationWithType(2, localType),
    createStationWithType(3, expressType),
    createStationWithType(4, expressType),
    createStationWithType(5, localType),
    createStationWithType(6, localType),
  ];

  const setup = ({
    stations,
    currentStation,
    trainType,
    selectedDirection = 'INBOUND',
  }: {
    stations: Station[];
    currentStation: Station | undefined;
    trainType: TrainType | null;
    selectedDirection?: LineDirection;
  }) => {
    mockUseAtomValue.mockImplementation((atom) => {
      if (atom === stationsAtom) {
        return stations;
      }
      if (atom === selectedDirectionAtom) {
        return selectedDirection;
      }
      throw new Error('unknown atom');
    });
    mockUseCurrentStation.mockReturnValue(currentStation);
    mockUseCurrentTrainType.mockReturnValue(trainType);
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('現在駅より先で最初に変わる種別を返す', () => {
    setup({
      stations: inboundStations,
      currentStation: inboundStations[0],
      trainType: localType,
    });

    const { getByTestId } = render(<TestComponent />);

    expect(getByTestId('nextTrainType').props.children).toBe(
      String(TRAIN_TYPE_IDS.EXPRESS)
    );
  });

  it('現在駅より先に種別が変わる駅が無い場合はnullを返す', () => {
    setup({
      stations: inboundStations,
      currentStation: inboundStations[4],
      trainType: localType,
    });

    const { getByTestId } = render(<TestComponent />);

    expect(getByTestId('nextTrainType').props.children).toBe('null');
  });

  // Issue #6746: 経路全体を先頭から走査していたため、既に通過したはずの
  // 急行区間を次の種別として返し、終着駅での種別変更が案内されていた
  it('現在駅が経路内に無い場合は経路全体から推定せずnullを返す', () => {
    setup({
      stations: inboundStations,
      currentStation: undefined,
      trainType: localType,
    });

    const { getByTestId } = render(<TestComponent />);

    expect(getByTestId('nextTrainType').props.children).toBe('null');
  });

  it('OUTBOUND時も現在駅より進行方向側の区間から次の種別を探す', () => {
    // OUTBOUND では stations が進行方向と逆順で保持される
    const outboundStations = inboundStations.slice().reverse();

    setup({
      stations: outboundStations,
      currentStation: inboundStations[0],
      trainType: localType,
      selectedDirection: 'OUTBOUND',
    });

    const { getByTestId } = render(<TestComponent />);

    expect(getByTestId('nextTrainType').props.children).toBe(
      String(TRAIN_TYPE_IDS.EXPRESS)
    );
  });

  it('OUTBOUND時に現在駅が経路内に無い場合もnullを返す', () => {
    const outboundStations = inboundStations.slice().reverse();

    setup({
      stations: outboundStations,
      currentStation: createStationWithType(999, localType),
      trainType: localType,
      selectedDirection: 'OUTBOUND',
    });

    const { getByTestId } = render(<TestComponent />);

    expect(getByTestId('nextTrainType').props.children).toBe('null');
  });
});

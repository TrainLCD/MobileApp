import { render } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { Text } from 'react-native';
import type { Station } from '~/@types/graphql';
import { LineType, OperationStatus, StopCondition } from '~/@types/graphql';
import getIsPass from '../utils/isPass';
import { useCurrentStation } from './useCurrentStation';
import { useNextStation } from './useNextStation';
import { useStoppingState } from './useStoppingState';

jest.mock('jotai', () => ({
  __esModule: true,
  useAtomValue: jest.fn(),
  atom: jest.fn(),
}));

jest.mock('./useCurrentStation', () => ({
  useCurrentStation: jest.fn(),
}));

jest.mock('./useNextStation', () => ({
  useNextStation: jest.fn(),
}));

jest.mock('../utils/isPass', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const createStation = (
  id: number,
  stopCondition: StopCondition = StopCondition.All
): Station => ({
  __typename: 'Station',
  address: null,
  closedAt: null,
  distance: null,
  groupId: id,
  hasTrainTypes: false,
  id,
  latitude: null,
  line: {
    __typename: 'LineNested',
    averageDistance: null,
    color: '#123456',
    company: null,
    id: 1,
    lineSymbols: [],
    lineType: LineType.Normal,
    nameChinese: null,
    nameFull: 'Test Line',
    nameKatakana: 'テストライン',
    nameKorean: null,
    nameRoman: 'Test Line',
    nameShort: 'Test',
    station: null,
    status: OperationStatus.InOperation,
    trainType: null,
  },
  lines: [],
  longitude: null,
  name: `Station${id}`,
  nameChinese: null,
  nameKatakana: `ステーション${id}`,
  nameKorean: null,
  nameRoman: `Station${id}`,
  openedAt: null,
  postalCode: null,
  prefectureId: null,
  stationNumbers: [],
  status: OperationStatus.InOperation,
  stopCondition,
  threeLetterCode: null,
  trainType: null,
});

const TestComponent: React.FC = () => {
  const state = useStoppingState();
  return <Text testID="state">{state}</Text>;
};

describe('useStoppingState', () => {
  const mockUseAtomValue = useAtomValue as jest.MockedFunction<
    typeof useAtomValue
  >;
  const mockUseCurrentStation = useCurrentStation as jest.MockedFunction<
    typeof useCurrentStation
  >;
  const mockUseNextStation = useNextStation as jest.MockedFunction<
    typeof useNextStation
  >;
  const mockGetIsPass = getIsPass as jest.MockedFunction<typeof getIsPass>;

  beforeEach(() => {
    mockGetIsPass.mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('arrived=trueかつ通過駅でない場合、CURRENTを返す', () => {
    const currentStation = createStation(1, StopCondition.All);
    const nextStation = createStation(2, StopCondition.All);

    mockUseAtomValue.mockReturnValue({
      arrived: true,
      approaching: false,
    });

    mockUseCurrentStation.mockReturnValue(currentStation);
    mockUseNextStation.mockReturnValue(nextStation);
    mockGetIsPass.mockReturnValue(false);

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('state').props.children).toBe('CURRENT');
  });

  it('nextStationがundefinedの場合、CURRENTを返す', () => {
    const currentStation = createStation(1, StopCondition.All);

    mockUseAtomValue.mockReturnValue({
      arrived: false,
      approaching: false,
    });

    mockUseCurrentStation.mockReturnValue(currentStation);
    mockUseNextStation.mockReturnValue(undefined);

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('state').props.children).toBe('CURRENT');
  });

  it('approaching=trueかつarrived=falseかつ次の駅が通過駅でない場合、ARRIVINGを返す', () => {
    const currentStation = createStation(1, StopCondition.All);
    const nextStation = createStation(2, StopCondition.All);

    mockUseAtomValue.mockReturnValue({
      arrived: false,
      approaching: true,
    });

    mockUseCurrentStation.mockReturnValue(currentStation);
    mockUseNextStation.mockReturnValue(nextStation);
    mockGetIsPass.mockReturnValue(false);

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('state').props.children).toBe('ARRIVING');
  });

  it('approaching=trueだが次の駅が通過駅の場合、NEXTを返す', () => {
    const currentStation = createStation(1, StopCondition.All);
    const nextStation = createStation(2, StopCondition.Not); // pass station

    mockUseAtomValue.mockReturnValue({
      arrived: false,
      approaching: true,
    });

    mockUseCurrentStation.mockReturnValue(currentStation);
    mockUseNextStation.mockReturnValue(nextStation);
    mockGetIsPass.mockImplementation(
      (s) => s?.stopCondition === StopCondition.Not
    );

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('state').props.children).toBe('NEXT');
  });

  it('approaching=falseかつarrived=falseの場合、NEXTを返す', () => {
    const currentStation = createStation(1, StopCondition.All);
    const nextStation = createStation(2, StopCondition.All);

    mockUseAtomValue.mockReturnValue({
      arrived: false,
      approaching: false,
    });

    mockUseCurrentStation.mockReturnValue(currentStation);
    mockUseNextStation.mockReturnValue(nextStation);
    mockGetIsPass.mockReturnValue(false);

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('state').props.children).toBe('NEXT');
  });

  it('arrived=trueだがcurrentStationが通過駅の場合、NEXTを返す', () => {
    const currentStation = createStation(1, StopCondition.Not); // pass station
    const nextStation = createStation(2, StopCondition.All);

    mockUseAtomValue.mockReturnValue({
      arrived: true,
      approaching: false,
    });

    mockUseCurrentStation.mockReturnValue(currentStation);
    mockUseNextStation.mockReturnValue(nextStation);
    mockGetIsPass.mockImplementation(
      (s) => s?.stopCondition === StopCondition.Not
    );

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('state').props.children).toBe('NEXT');
  });

  it('arrived=trueかつapproaching=trueかつcurrentStationが通過駅でない場合、CURRENTを返す', () => {
    const currentStation = createStation(1, StopCondition.All);
    const nextStation = createStation(2, StopCondition.All);

    mockUseAtomValue.mockReturnValue({
      arrived: true,
      approaching: true,
    });

    mockUseCurrentStation.mockReturnValue(currentStation);
    mockUseNextStation.mockReturnValue(nextStation);
    mockGetIsPass.mockReturnValue(false);

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('state').props.children).toBe('CURRENT');
  });
});

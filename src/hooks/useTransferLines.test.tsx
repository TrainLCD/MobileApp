import { render } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { Text } from 'react-native';
import type { Line, Station } from '~/@types/graphql';
import { LineType, OperationStatus, StopCondition } from '~/@types/graphql';
import stationState from '../store/atoms/station';
import getIsPass from '../utils/isPass';
import { useCurrentStation } from './useCurrentStation';
import { useNextStation } from './useNextStation';
import { useTransferLines } from './useTransferLines';
import { useTransferLinesFromStation } from './useTransferLinesFromStation';

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
jest.mock('./useTransferLinesFromStation', () => ({
  useTransferLinesFromStation: jest.fn(),
}));
jest.mock('../utils/isPass', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const TestComponent: React.FC<{
  options?: { omitJR?: boolean; hideBuses?: boolean };
}> = ({ options }) => {
  const lines = useTransferLines(options);
  return <Text testID="transferLines">{JSON.stringify(lines)}</Text>;
};

const createLine = (
  overrides: Partial<Line> = {},
  typename: Line['__typename'] = 'Line'
): Line => ({
  __typename: typename,
  averageDistance: null,
  color: '#123456',
  company: null,
  id: 1,
  lineSymbols: [],
  lineType: LineType.Normal,
  nameChinese: null,
  nameFull: 'Line',
  nameKatakana: 'ライン',
  nameKorean: '라인',
  nameRoman: 'Line',
  nameShort: 'Line',
  station: null,
  status: OperationStatus.InOperation,
  trainType: null,
  transportType: null,
  ...overrides,
});

const createStation = (
  id: number,
  overrides: Partial<Station> = {}
): Station => ({
  __typename: 'Station',
  address: null,
  closedAt: null,
  distance: null,
  groupId: id,
  hasTrainTypes: false,
  id,
  latitude: null,
  line: null,
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
  stopCondition: StopCondition.All,
  threeLetterCode: null,
  trainType: null,
  transportType: null,
  ...overrides,
});

describe('useTransferLines', () => {
  const mockUseAtomValue = useAtomValue as jest.MockedFunction<
    typeof useAtomValue
  >;
  const mockUseCurrentStation = useCurrentStation as jest.MockedFunction<
    typeof useCurrentStation
  >;
  const mockUseNextStation = useNextStation as jest.MockedFunction<
    typeof useNextStation
  >;
  const mockUseTransferLinesFromStation =
    useTransferLinesFromStation as jest.MockedFunction<
      typeof useTransferLinesFromStation
    >;
  const mockGetIsPass = getIsPass as jest.MockedFunction<typeof getIsPass>;

  let stationAtomValue: { arrived: boolean };
  let currentStationValue: Station | undefined;
  let nextStationValue: Station | null;

  beforeEach(() => {
    stationAtomValue = { arrived: false };
    currentStationValue = undefined;
    nextStationValue = null;
    mockUseAtomValue.mockImplementation((atom) => {
      if (atom === stationState) {
        return stationAtomValue;
      }
      throw new Error('unknown atom');
    });
    mockUseCurrentStation.mockImplementation(() => currentStationValue);
    mockUseNextStation.mockImplementation(() => nextStationValue ?? undefined);
    mockUseTransferLinesFromStation.mockReturnValue([]);
    mockGetIsPass.mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('到着済みかつ停車駅なら現在駅の乗換情報を返す', () => {
    const currentStation = createStation(1);
    const transferLines = [
      createLine({ id: 100, nameShort: 'metro' }),
      createLine({ id: 101, nameShort: 'jr' }),
    ];
    stationAtomValue.arrived = true;
    currentStationValue = currentStation;
    nextStationValue = createStation(2);
    mockUseTransferLinesFromStation.mockReturnValue(transferLines);

    const { getByTestId } = render(<TestComponent />);

    expect(mockUseTransferLinesFromStation).toHaveBeenCalledWith(
      currentStation,
      {
        omitRepeatingLine: undefined,
        omitJR: false,
        hideBuses: true,
      }
    );
    expect(getByTestId('transferLines').props.children).toContain('metro');
  });

  it('通過駅では次駅を対象にする', () => {
    const currentStation = createStation(10);
    const followingStation = createStation(11);
    stationAtomValue.arrived = true;
    currentStationValue = currentStation;
    nextStationValue = followingStation;
    mockGetIsPass.mockReturnValue(true);

    render(<TestComponent options={{ omitJR: true }} />);

    expect(mockUseTransferLinesFromStation).toHaveBeenCalledWith(
      followingStation,
      {
        omitRepeatingLine: undefined,
        omitJR: true,
        hideBuses: undefined,
      }
    );
  });

  it('未到着時も次駅を対象にする', () => {
    const nextStation = createStation(20);
    stationAtomValue.arrived = false;
    nextStationValue = nextStation;

    render(<TestComponent />);

    expect(mockUseTransferLinesFromStation).toHaveBeenCalledWith(nextStation, {
      omitRepeatingLine: undefined,
      omitJR: false,
      hideBuses: true,
    });
  });

  it('hideBuses: falseを指定するとバス路線も含めて渡す', () => {
    const currentStation = createStation(30);
    const transferLines = [
      createLine({ id: 200, nameShort: 'metro' }),
      createLine({ id: 201, nameShort: 'bus' }),
    ];
    stationAtomValue.arrived = true;
    currentStationValue = currentStation;
    nextStationValue = createStation(31);
    mockUseTransferLinesFromStation.mockReturnValue(transferLines);

    const { getByTestId } = render(
      <TestComponent options={{ hideBuses: false }} />
    );

    expect(mockUseTransferLinesFromStation).toHaveBeenCalledWith(
      currentStation,
      {
        omitRepeatingLine: undefined,
        omitJR: undefined,
        hideBuses: false,
      }
    );
    expect(getByTestId('transferLines').props.children).toContain('bus');
  });

  it('hideBuses: trueを明示的に指定するとバス路線を除外する', () => {
    const currentStation = createStation(40);
    stationAtomValue.arrived = true;
    currentStationValue = currentStation;
    nextStationValue = createStation(41);

    render(<TestComponent options={{ hideBuses: true }} />);

    expect(mockUseTransferLinesFromStation).toHaveBeenCalledWith(
      currentStation,
      {
        omitRepeatingLine: undefined,
        omitJR: undefined,
        hideBuses: true,
      }
    );
  });
});

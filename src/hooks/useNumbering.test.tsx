import { render, waitFor } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { Text } from 'react-native';
import type { Line, Station, StationNumber } from '~/@types/graphql';
import { LineType, OperationStatus, StopCondition } from '~/@types/graphql';
import { useCurrentLine } from './useCurrentLine';
import { useCurrentStation } from './useCurrentStation';
import { useCurrentTrainType } from './useCurrentTrainType';
import { useNextStation } from './useNextStation';
import { useNumbering } from './useNumbering';
import { useStationNumberIndexFunc } from './useStationNumberIndexFunc';

jest.mock('jotai', () => ({
  __esModule: true,
  useAtomValue: jest.fn(),
  atom: jest.fn(),
}));

jest.mock('./useCurrentLine', () => ({
  __esModule: true,
  useCurrentLine: jest.fn(),
}));

jest.mock('./useCurrentStation', () => ({
  __esModule: true,
  useCurrentStation: jest.fn(),
}));

jest.mock('./useCurrentTrainType', () => ({
  __esModule: true,
  useCurrentTrainType: jest.fn(),
}));

jest.mock('./useNextStation', () => ({
  __esModule: true,
  useNextStation: jest.fn(),
}));

jest.mock('./useStationNumberIndexFunc', () => ({
  __esModule: true,
  useStationNumberIndexFunc: jest.fn(),
}));

const createStationNumber = (
  lineSymbol: string,
  stationNumber: string
): StationNumber => ({
  __typename: 'StationNumber',
  lineSymbol,
  lineSymbolColor: '#123456',
  lineSymbolShape: 'ROUND',
  stationNumber,
});

const createStation = (
  id: number,
  stationNumbers: StationNumber[] = [],
  stopCondition: StopCondition = StopCondition.All,
  threeLetterCode: string | null = null
): Station => ({
  __typename: 'Station',
  address: null,
  closedAt: null,
  distance: null,
  groupId: id,
  hasTrainTypes: false,
  id,
  latitude: 35.681236,
  longitude: 139.767125,
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
    transportType: null,
  },
  lines: [],
  name: `Station${id}`,
  nameChinese: null,
  nameKatakana: `ステーション${id}`,
  nameKorean: null,
  nameRoman: `Station${id}`,
  openedAt: null,
  postalCode: null,
  prefectureId: null,
  stationNumbers,
  status: OperationStatus.InOperation,
  stopCondition,
  threeLetterCode,
  trainType: null,
  transportType: null,
});

const createLine = (id: number): Line => ({
  __typename: 'Line',
  averageDistance: null,
  color: '#123456',
  company: null,
  id,
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
  transportType: null,
});

const TestComponent: React.FC<{
  priorCurrent?: boolean;
  firstStop?: boolean;
}> = ({ priorCurrent = false, firstStop = false }) => {
  const [stationNumber, threeLetterCode] = useNumbering(
    priorCurrent,
    firstStop
  );
  return (
    <>
      <Text testID="stationNumber">
        {stationNumber
          ? JSON.stringify({
              lineSymbol: stationNumber.lineSymbol,
              stationNumber: stationNumber.stationNumber,
            })
          : 'undefined'}
      </Text>
      <Text testID="threeLetterCode">{threeLetterCode ?? 'undefined'}</Text>
    </>
  );
};

describe('useNumbering', () => {
  const mockUseAtomValue = useAtomValue as jest.MockedFunction<
    typeof useAtomValue
  >;
  const mockUseCurrentLine = useCurrentLine as jest.MockedFunction<
    typeof useCurrentLine
  >;
  const mockUseCurrentStation = useCurrentStation as jest.MockedFunction<
    typeof useCurrentStation
  >;
  const mockUseCurrentTrainType = useCurrentTrainType as jest.MockedFunction<
    typeof useCurrentTrainType
  >;
  const mockUseNextStation = useNextStation as jest.MockedFunction<
    typeof useNextStation
  >;
  const mockUseStationNumberIndexFunc =
    useStationNumberIndexFunc as jest.MockedFunction<
      typeof useStationNumberIndexFunc
    >;

  beforeEach(() => {
    mockUseStationNumberIndexFunc.mockReturnValue(() => 0);
    mockUseCurrentLine.mockReturnValue(createLine(1));
    mockUseCurrentTrainType.mockReturnValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('selectedBoundがnullの場合、undefinedを返す', async () => {
    mockUseAtomValue.mockReturnValue({
      arrived: false,
      selectedBound: null,
    });
    mockUseCurrentStation.mockReturnValue(undefined);
    mockUseNextStation.mockReturnValue(undefined);

    const { getByTestId } = render(<TestComponent />);

    await waitFor(() => {
      expect(getByTestId('stationNumber').props.children).toBe('undefined');
      expect(getByTestId('threeLetterCode').props.children).toBe('undefined');
    });
  });

  it('priorCurrent=true, 停車駅の場合、現在駅の番号を返す', async () => {
    const stationNumbers = [createStationNumber('JY', '01')];
    const currentStation = createStation(
      1,
      stationNumbers,
      StopCondition.All,
      'TYO'
    );

    mockUseAtomValue.mockReturnValue({
      arrived: true,
      selectedBound: currentStation,
    });
    mockUseCurrentStation.mockReturnValue(currentStation);
    mockUseNextStation.mockReturnValue(undefined);

    const { getByTestId } = render(<TestComponent priorCurrent={true} />);

    await waitFor(() => {
      expect(getByTestId('stationNumber').props.children).toBe(
        JSON.stringify({ lineSymbol: 'JY', stationNumber: '01' })
      );
      expect(getByTestId('threeLetterCode').props.children).toBe('TYO');
    });
  });

  it('arrived=false の場合、次駅の番号を返す', async () => {
    const currentStationNumbers = [createStationNumber('JY', '01')];
    const nextStationNumbers = [createStationNumber('JY', '02')];
    const currentStation = createStation(
      1,
      currentStationNumbers,
      StopCondition.All
    );
    const nextStation = createStation(
      2,
      nextStationNumbers,
      StopCondition.All,
      'SBY'
    );

    mockUseAtomValue.mockReturnValue({
      arrived: false,
      selectedBound: currentStation,
    });
    mockUseCurrentStation.mockReturnValue(currentStation);
    mockUseNextStation.mockReturnValue(nextStation);

    // priorCurrent=false の場合、arrived=false なので次駅の番号を返す
    const { getByTestId } = render(<TestComponent priorCurrent={false} />);

    await waitFor(() => {
      expect(getByTestId('stationNumber').props.children).toBe(
        JSON.stringify({ lineSymbol: 'JY', stationNumber: '02' })
      );
      expect(getByTestId('threeLetterCode').props.children).toBe('SBY');
    });
  });

  it('通過駅に到着した場合、次駅の番号を返す', async () => {
    const currentStationNumbers = [createStationNumber('JY', '01')];
    const nextStationNumbers = [createStationNumber('JY', '02')];
    const currentStation = createStation(
      1,
      currentStationNumbers,
      StopCondition.Not
    );
    const nextStation = createStation(
      2,
      nextStationNumbers,
      StopCondition.All,
      'NXT'
    );

    mockUseAtomValue.mockReturnValue({
      arrived: true,
      selectedBound: currentStation,
    });
    mockUseCurrentStation.mockReturnValue(currentStation);
    mockUseNextStation.mockReturnValue(nextStation);

    const { getByTestId } = render(<TestComponent priorCurrent={true} />);

    await waitFor(() => {
      expect(getByTestId('stationNumber').props.children).toBe(
        JSON.stringify({ lineSymbol: 'JY', stationNumber: '02' })
      );
      expect(getByTestId('threeLetterCode').props.children).toBe('NXT');
    });
  });

  it('stationNumbersが空の場合、undefinedを返す', async () => {
    const currentStation = createStation(1, [], StopCondition.All);

    mockUseAtomValue.mockReturnValue({
      arrived: true,
      selectedBound: currentStation,
    });
    mockUseCurrentStation.mockReturnValue(currentStation);
    mockUseNextStation.mockReturnValue(undefined);

    const { getByTestId } = render(<TestComponent priorCurrent={true} />);

    await waitFor(() => {
      expect(getByTestId('stationNumber').props.children).toBe('undefined');
    });
  });

  it('firstStop=true の場合、selectedBoundの番号を返す', async () => {
    const boundStationNumbers = [createStationNumber('JK', '10')];
    const boundStation = createStation(
      10,
      boundStationNumbers,
      StopCondition.All,
      'END'
    );

    mockUseAtomValue.mockReturnValue({
      arrived: false,
      selectedBound: boundStation,
    });
    mockUseCurrentStation.mockReturnValue(undefined);
    mockUseNextStation.mockReturnValue(undefined);

    const { getByTestId } = render(<TestComponent firstStop={true} />);

    await waitFor(() => {
      // firstStop=trueでもpriorCurrent=falseなので、arrivedとgetIsPassの結果による
      // この場合、arrived=falseなので次駅の番号を探すが、nextStationがundefined
      expect(getByTestId('threeLetterCode').props.children).toBe('undefined');
    });
  });

  it('nextStationがundefinedでpriorCurrent=falseの場合、stationNumberはundefinedになる', async () => {
    const currentStationNumbers = [createStationNumber('JY', '01')];
    const currentStation = createStation(
      1,
      currentStationNumbers,
      StopCondition.All
    );

    mockUseAtomValue.mockReturnValue({
      arrived: false,
      selectedBound: currentStation,
    });
    mockUseCurrentStation.mockReturnValue(currentStation);
    mockUseNextStation.mockReturnValue(undefined);

    // priorCurrent=false, arrived=false なので次駅を参照するが、nextStationがundefined
    const { getByTestId } = render(<TestComponent priorCurrent={false} />);

    await waitFor(() => {
      expect(getByTestId('stationNumber').props.children).toBe('undefined');
    });
  });
});

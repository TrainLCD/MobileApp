import { render, waitFor } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { Text } from 'react-native';
import { StopCondition } from '~/@types/graphql';
import {
  createLine,
  createStation,
  createStationNumber,
} from '~/utils/test/factories';
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
    const currentStation = createStation(1, {
      stationNumbers,
      stopCondition: StopCondition.All,
      threeLetterCode: 'TYO',
    });

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
    const currentStation = createStation(1, {
      stationNumbers: currentStationNumbers,
      stopCondition: StopCondition.All,
    });
    const nextStation = createStation(2, {
      stationNumbers: nextStationNumbers,
      stopCondition: StopCondition.All,
      threeLetterCode: 'SBY',
    });

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
    const currentStation = createStation(1, {
      stationNumbers: currentStationNumbers,
      stopCondition: StopCondition.Not,
    });
    const nextStation = createStation(2, {
      stationNumbers: nextStationNumbers,
      stopCondition: StopCondition.All,
      threeLetterCode: 'NXT',
    });

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
    const currentStation = createStation(1, {
      stationNumbers: [],
      stopCondition: StopCondition.All,
    });

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
    const boundStation = createStation(10, {
      stationNumbers: boundStationNumbers,
      stopCondition: StopCondition.All,
      threeLetterCode: 'END',
    });

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
    const currentStation = createStation(1, {
      stationNumbers: currentStationNumbers,
      stopCondition: StopCondition.All,
    });

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

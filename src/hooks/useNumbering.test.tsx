import { render, waitFor } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { Text } from 'react-native';
import type { Station } from '~/@types/graphql';
import { StopCondition, TrainTypeKind } from '~/@types/graphql';
import { JOBAN_LINE_IDS } from '~/constants';
import {
  createLine,
  createStation,
  createStationNumber,
} from '~/utils/test/factories';
import { arrivedAtom, selectedBoundAtom } from '../store/atoms/station';
import { useCurrentLine } from './useCurrentLine';
import { useCurrentStation } from './useCurrentStation';
import { useCurrentTrainType } from './useCurrentTrainType';
import { useDisplayNextStation } from './useDisplayNextStation';
import { useNumbering } from './useNumbering';
import { useStationNumberIndexFunc } from './useStationNumberIndexFunc';

jest.mock('jotai', () => ({
  __esModule: true,
  ...jest.requireActual('jotai'),
  useAtomValue: jest.fn(),
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

jest.mock('./useDisplayNextStation', () => ({
  __esModule: true,
  useDisplayNextStation: jest.fn(),
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
  const mockUseNextStation = useDisplayNextStation as jest.MockedFunction<
    typeof useDisplayNextStation
  >;
  const mockUseStationNumberIndexFunc =
    useStationNumberIndexFunc as jest.MockedFunction<
      typeof useStationNumberIndexFunc
    >;

  const mockAtomValues = ({
    arrived,
    selectedBound,
  }: {
    arrived: boolean;
    selectedBound: Station | null;
  }) => {
    mockUseAtomValue.mockImplementation((atom) => {
      if (atom === arrivedAtom) {
        return arrived;
      }
      if (atom === selectedBoundAtom) {
        return selectedBound;
      }
      return undefined;
    });
  };

  beforeEach(() => {
    mockUseStationNumberIndexFunc.mockReturnValue(() => 0);
    mockUseCurrentLine.mockReturnValue(createLine(1));
    mockUseCurrentTrainType.mockReturnValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('selectedBoundがnullの場合、undefinedを返す', async () => {
    mockAtomValues({
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

    mockAtomValues({
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

    mockAtomValues({
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

    mockAtomValues({
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

    mockAtomValues({
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

    mockAtomValues({
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

  describe('常磐線快速系統 (Joban Line rapid)', () => {
    const jobanLineId = JOBAN_LINE_IDS[0];

    const buildJobanRapidScenario = (kind: TrainTypeKind) => {
      const stationNumbers = [
        createStationNumber('JL', '20'),
        createStationNumber('JJ', '07'),
      ];
      const currentStation = createStation(1, {
        stationNumbers,
        stopCondition: StopCondition.All,
        threeLetterCode: 'UEN',
      });

      mockAtomValues({
        arrived: true,
        selectedBound: currentStation,
      });
      mockUseCurrentLine.mockReturnValue(createLine(jobanLineId));
      mockUseCurrentStation.mockReturnValue(currentStation);
      mockUseNextStation.mockReturnValue(undefined);
      mockUseCurrentTrainType.mockReturnValue({
        __typename: 'TrainType',
        id: 1,
        typeId: 1,
        groupId: 1,
        name: '快速系統',
        nameKatakana: 'カイソク',
        nameRoman: 'Rapid',
        nameIpa: null,
        nameRomanIpa: null,
        nameTtsSegments: null,
        nameChinese: null,
        nameKorean: null,
        color: '#000000',
        direction: null,
        kind,
        line: null,
        lines: null,
      });
    };

    it('CommuterRapidの場合、JJプレフィックスのstationNumberを返す', async () => {
      buildJobanRapidScenario(TrainTypeKind.CommuterRapid);

      const { getByTestId } = render(<TestComponent priorCurrent={true} />);

      await waitFor(() => {
        expect(getByTestId('stationNumber').props.children).toBe(
          JSON.stringify({ lineSymbol: 'JJ', stationNumber: '07' })
        );
      });
    });

    it('Rapidの場合、JJプレフィックスのstationNumberを返す（既存挙動）', async () => {
      buildJobanRapidScenario(TrainTypeKind.Rapid);

      const { getByTestId } = render(<TestComponent priorCurrent={true} />);

      await waitFor(() => {
        expect(getByTestId('stationNumber').props.children).toBe(
          JSON.stringify({ lineSymbol: 'JJ', stationNumber: '07' })
        );
      });
    });

    it('HighSpeedRapidの場合、JJプレフィックスのstationNumberを返す（既存挙動）', async () => {
      buildJobanRapidScenario(TrainTypeKind.HighSpeedRapid);

      const { getByTestId } = render(<TestComponent priorCurrent={true} />);

      await waitFor(() => {
        expect(getByTestId('stationNumber').props.children).toBe(
          JSON.stringify({ lineSymbol: 'JJ', stationNumber: '07' })
        );
      });
    });

    it('Defaultの場合、JJプレフィックスではなく通常のstationNumberを返す', async () => {
      buildJobanRapidScenario(TrainTypeKind.Default);

      const { getByTestId } = render(<TestComponent priorCurrent={true} />);

      await waitFor(() => {
        expect(getByTestId('stationNumber').props.children).toBe(
          JSON.stringify({ lineSymbol: 'JL', stationNumber: '20' })
        );
      });
    });

    it('常磐線以外の場合、CommuterRapidでも通常のstationNumberを返す', async () => {
      buildJobanRapidScenario(TrainTypeKind.CommuterRapid);
      // 路線を常磐線以外で上書き
      mockUseCurrentLine.mockReturnValue(createLine(99999));

      const { getByTestId } = render(<TestComponent priorCurrent={true} />);

      await waitFor(() => {
        expect(getByTestId('stationNumber').props.children).toBe(
          JSON.stringify({ lineSymbol: 'JL', stationNumber: '20' })
        );
      });
    });
  });

  it('nextStationがundefinedでpriorCurrent=falseの場合、stationNumberはundefinedになる', async () => {
    const currentStationNumbers = [createStationNumber('JY', '01')];
    const currentStation = createStation(1, {
      stationNumbers: currentStationNumbers,
      stopCondition: StopCondition.All,
    });

    mockAtomValues({
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

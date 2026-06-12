import { render } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import type React from 'react';
import { type Station, StopCondition } from '~/@types/graphql';
import {
  useCurrentLine,
  useCurrentTrainType,
  useHeaderCommonData,
  useTransferLinesFromStation,
} from '~/hooks';
import { leftStationsAtom } from '~/store/atoms/navigation';
import PortraitMain from './PortraitMain';

jest.mock('~/translation', () => ({
  isJapanese: true,
  translate: (key: string) => key,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('./NumberingIcon', () => () => null);

jest.mock('~/hooks', () => ({
  useCurrentLine: jest.fn(),
  useCurrentTrainType: jest.fn(),
  useHeaderCommonData: jest.fn(),
  useStationNumberIndexFunc: jest.fn(() => () => 0),
  useTransferLinesFromStation: jest.fn(() => []),
}));

const mockedUseHeaderCommonData = useHeaderCommonData as jest.Mock;
const mockedUseCurrentLine = useCurrentLine as jest.Mock;
const mockedUseCurrentTrainType = useCurrentTrainType as jest.Mock;
const mockedUseTransferLinesFromStation =
  useTransferLinesFromStation as jest.Mock;

const yamanoteLine = {
  id: 11302,
  color: '#80C241',
  nameShort: '山手線',
  nameRoman: 'Yamanote Line',
};

const commonData = {
  stateText: 'nextKana',
  stationText: '高輪ゲートウェイ',
  boundText: '品川・大崎方面',
  currentStationNumber: {
    lineSymbol: 'JY',
    lineSymbolColor: '#80C241',
    lineSymbolShape: 'ROUND',
    stationNumber: 'JY-26',
  },
  threeLetterCode: undefined,
  numberingColor: '#80C241',
};

const buildStation = (
  id: number,
  name: string,
  stopCondition: StopCondition,
  stationNumber?: string
): Station =>
  ({
    id,
    name,
    nameRoman: `${name}-roman`,
    stopCondition,
    stationNumbers: stationNumber ? [{ stationNumber }] : [],
    line: yamanoteLine,
    lines: [],
  }) as unknown as Station;

const renderWithStations = (stations: Station[]) => {
  const store = createStore();
  store.set(leftStationsAtom, stations);

  return render(
    <Provider store={store}>
      <PortraitMain />
    </Provider>
  );
};

describe('PortraitMain', () => {
  beforeEach(() => {
    mockedUseHeaderCommonData.mockReturnValue(commonData);
    mockedUseCurrentLine.mockReturnValue(yamanoteLine);
    mockedUseCurrentTrainType.mockReturnValue({
      name: '各駅停車',
      nameRoman: 'Local',
      color: '#123456',
    });
    mockedUseTransferLinesFromStation.mockReturnValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('路線名・種別・行き先・状態テキスト・駅名を表示する', () => {
    const { getByText } = renderWithStations([
      buildStation(1, '品川', StopCondition.All, 'JY-25'),
    ]);

    expect(getByText('山手線')).toBeTruthy();
    expect(getByText('各駅停車')).toBeTruthy();
    expect(getByText('品川・大崎方面')).toBeTruthy();
    expect(getByText('nextKana')).toBeTruthy();
    expect(getByText('高輪ゲートウェイ')).toBeTruthy();
  });

  it('停車駅リストに駅名とナンバリングを表示し通過駅には通過ラベルを付ける', () => {
    const { getByText, getAllByText } = renderWithStations([
      buildStation(1, '品川', StopCondition.All, 'JY-25'),
      buildStation(2, '高輪ゲートウェイ', StopCondition.Not, 'JY-26'),
      buildStation(3, '田町', StopCondition.All, 'JY-27'),
    ]);

    expect(getByText('品川')).toBeTruthy();
    expect(getByText('田町')).toBeTruthy();
    expect(getByText('JY-25')).toBeTruthy();
    expect(getByText('JY-27')).toBeTruthy();
    // 通過駅は1駅だけなので通過ラベルも1つ
    expect(getAllByText('passStationLabel')).toHaveLength(1);
  });

  it('ヘッダーデータが揃っていない間は何も表示しない', () => {
    mockedUseHeaderCommonData.mockReturnValue(null);

    const { queryByText } = renderWithStations([
      buildStation(1, '品川', StopCondition.All, 'JY-25'),
    ]);

    expect(queryByText('山手線')).toBeNull();
    expect(queryByText('品川')).toBeNull();
  });
});

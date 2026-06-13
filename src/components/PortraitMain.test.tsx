import { render, within } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import type React from 'react';
import { StyleSheet } from 'react-native';
import { type Station, StopCondition } from '~/@types/graphql';
import {
  useCurrentLine,
  useCurrentTrainType,
  useHeaderCommonData,
  useTransferLinesFromStation,
} from '~/hooks';
import { leftStationsAtom } from '~/store/atoms/navigation';
import { arrivedAtom } from '~/store/atoms/station';
import { RFValue } from '~/utils/rfValue';
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
  stationNumber?: string,
  line: typeof yamanoteLine = yamanoteLine
): Station =>
  ({
    id,
    name,
    nameRoman: `${name}-roman`,
    stopCondition,
    stationNumbers: stationNumber ? [{ stationNumber }] : [],
    line,
    lines: [],
  }) as unknown as Station;

const renderWithStations = (
  stations: Station[],
  { arrived = true }: { arrived?: boolean } = {}
) => {
  const store = createStore();
  store.set(leftStationsAtom, stations);
  store.set(arrivedAtom, arrived);

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

  it('発車後は先頭駅の行が半透明になり強調が次の停車駅へ移る', () => {
    const { getByTestId, getByText } = renderWithStations(
      [
        buildStation(1, '品川', StopCondition.All, 'JY-25'),
        buildStation(2, '田町', StopCondition.All, 'JY-27'),
        buildStation(3, '浜松町', StopCondition.All, 'JY-28'),
      ],
      { arrived: false }
    );

    expect(
      StyleSheet.flatten(getByTestId('stop-row-1').props.style).opacity
    ).toBe(0.4);
    expect(
      StyleSheet.flatten(getByTestId('stop-row-2').props.style).opacity
    ).toBeUndefined();
    // 強調(フォント拡大)は発車済みの品川ではなく次の停車駅の田町に付く
    expect(StyleSheet.flatten(getByText('田町').props.style).fontSize).toBe(
      RFValue(18)
    );
    expect(StyleSheet.flatten(getByText('品川').props.style).fontSize).toBe(
      RFValue(16)
    );
    // 列車位置の三角は現在駅と次駅の間(次駅行の上側セグメント)に出る
    expect(
      within(getByTestId('stop-row-2')).getByTestId('train-chevron')
    ).toBeTruthy();
    expect(
      within(getByTestId('stop-row-1')).queryByTestId('train-chevron')
    ).toBeNull();
  });

  it('停車中は先頭駅が強調され半透明にならない', () => {
    const { getByTestId, getByText } = renderWithStations(
      [
        buildStation(1, '品川', StopCondition.All, 'JY-25'),
        buildStation(2, '田町', StopCondition.All, 'JY-27'),
      ],
      { arrived: true }
    );

    expect(
      StyleSheet.flatten(getByTestId('stop-row-1').props.style).opacity
    ).toBeUndefined();
    expect(StyleSheet.flatten(getByText('品川').props.style).fontSize).toBe(
      RFValue(18)
    );
    // 列車位置の三角は現在駅の行に出る
    expect(
      within(getByTestId('stop-row-1')).getByTestId('train-chevron')
    ).toBeTruthy();
  });

  it('直通先の駅は直通先のラインカラーで描画される', () => {
    const keihinTohokuLine = {
      id: 11332,
      color: '#00B2E5',
      nameShort: '京浜東北線',
      nameRoman: 'Keihin-Tohoku Line',
    };
    const { getByTestId } = renderWithStations([
      buildStation(1, '品川', StopCondition.All, 'JY-25'),
      buildStation(2, '大井町', StopCondition.All, 'JK-19', keihinTohokuLine),
    ]);

    expect(
      StyleSheet.flatten(getByTestId('stop-dot-1').props.style).borderColor
    ).toBe(yamanoteLine.color);
    expect(
      StyleSheet.flatten(getByTestId('stop-dot-2').props.style).borderColor
    ).toBe(keihinTohokuLine.color);
  });

  it('現在駅にナンバリングがあるときは駅名の左に固定幅の枠を確保する', () => {
    const { getByTestId } = renderWithStations([
      buildStation(1, '品川', StopCondition.All, 'JY-25'),
    ]);

    expect(getByTestId('numbering-column')).toBeTruthy();
  });

  it('現在駅にナンバリングがないときは枠を確保せず駅名表示に充てる', () => {
    mockedUseHeaderCommonData.mockReturnValue({
      ...commonData,
      currentStationNumber: null,
    });

    const { queryByTestId, getByText } = renderWithStations([
      buildStation(1, '品川', StopCondition.All),
    ]);

    expect(queryByTestId('numbering-column')).toBeNull();
    // 記号との間隔用パディングも付かず、駅名が左端から始まる
    expect(
      StyleSheet.flatten(getByText('高輪ゲートウェイ').props.style).paddingLeft
    ).toBeUndefined();
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

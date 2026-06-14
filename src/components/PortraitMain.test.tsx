import { fireEvent, render, within } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import { StyleSheet } from 'react-native';
import { type Station, StopCondition } from '~/@types/graphql';
import {
  useCurrentLine,
  useCurrentStation,
  useCurrentTrainType,
  useHeaderCommonData,
  useTransferLinesFromStation,
} from '~/hooks';
import {
  arrivedAtom,
  selectedDirectionAtom,
  stationsAtom,
} from '~/store/atoms/station';
import { RFValue } from '~/utils/rfValue';
import PortraitMain from './PortraitMain';

jest.mock('~/translation', () => ({
  isJapanese: true,
  translate: (key: string) => key,
}));

jest.mock('./NumberingIcon', () => () => null);

jest.mock('~/hooks', () => ({
  useBoundText: jest.fn(() => ({ JA: '品川・大崎方面' })),
  useCurrentLine: jest.fn(),
  useCurrentStation: jest.fn(),
  useCurrentTrainType: jest.fn(),
  useHeaderCommonData: jest.fn(),
  useStationNumberIndexFunc: jest.fn(() => () => 0),
  useTransferLinesFromStation: jest.fn(() => []),
}));

const mockedUseHeaderCommonData = useHeaderCommonData as jest.Mock;
const mockedUseCurrentLine = useCurrentLine as jest.Mock;
const mockedUseCurrentStation = useCurrentStation as jest.Mock;
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
    groupId: id,
    name,
    nameRoman: `${name}-roman`,
    stopCondition,
    stationNumbers: stationNumber ? [{ stationNumber }] : [],
    line,
    lines: [],
  }) as unknown as Station;

const renderWithStations = (
  stations: Station[],
  {
    arrived = true,
    currentStation = stations[0],
  }: { arrived?: boolean; currentStation?: Station } = {}
) => {
  const store = createStore();
  // 全駅表示。INBOUND は反転しないので渡した順がそのまま表示順になる。
  store.set(stationsAtom, stations);
  store.set(selectedDirectionAtom, 'INBOUND');
  store.set(arrivedAtom, arrived);
  mockedUseCurrentStation.mockReturnValue(currentStation);

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
    const { getByText, getByTestId } = renderWithStations([
      buildStation(1, '品川', StopCondition.All, 'JY-25'),
    ]);

    expect(getByText('山手線')).toBeTruthy();
    expect(getByText('各駅停車')).toBeTruthy();
    expect(getByText('品川・大崎方面')).toBeTruthy();
    expect(getByText('nextKana')).toBeTruthy();
    // 駅名は表示用と測定用の2つがあるため testID で表示用を取得
    expect(getByTestId('portrait-station-name').props.children).toBe(
      '高輪ゲートウェイ'
    );
  });

  it('駅名がスロットに収まるときは末尾欠け防止のバッファ分だけ余白を取り横圧縮しない', () => {
    const { getByTestId } = renderWithStations([
      buildStation(1, '品川', StopCondition.All, 'JY-25'),
    ]);

    // スロット幅 300 に対し自然幅 200 ならバッファ込み 208 でも収まる
    fireEvent(getByTestId('portrait-station-name-slot'), 'layout', {
      nativeEvent: { layout: { width: 300 } },
    });
    fireEvent(getByTestId('portrait-station-name-measure'), 'textLayout', {
      nativeEvent: { lines: [{ width: 200 }] },
    });

    const style = StyleSheet.flatten(
      getByTestId('portrait-station-name').props.style
    );
    expect(style.width).toBe(208);
    expect(style.transform).toEqual([{ scaleX: 1 }]);
  });

  it('駅名がスロットをはみ出すときはバッファ込みの描画幅を基準に左基準で横圧縮する', () => {
    const { getByTestId } = renderWithStations([
      buildStation(1, '高輪ゲートウェイ', StopCondition.All, 'JY-26'),
    ]);

    // ナンバリングありのスロットは onLayout 値から 8px を差し引く
    fireEvent(getByTestId('portrait-station-name-slot'), 'layout', {
      nativeEvent: { layout: { width: 108 } },
    });
    fireEvent(getByTestId('portrait-station-name-measure'), 'textLayout', {
      nativeEvent: { lines: [{ width: 392 }] },
    });

    const style = StyleSheet.flatten(
      getByTestId('portrait-station-name').props.style
    );
    // 描画幅 = 392 + 8(バッファ) = 400、利用可能幅 = 108 - 8 = 100
    expect(style.width).toBe(400);
    expect(style.transform).toEqual([{ scaleX: 100 / 400 }]);
    expect(style.transformOrigin).toBe('left center');
  });

  it('停車駅リストに通過駅も含めて駅名とナンバリングを表示する', () => {
    const { getByText, queryByText } = renderWithStations([
      buildStation(1, '品川', StopCondition.All, 'JY-25'),
      buildStation(2, '新橋', StopCondition.Not, 'JY-26'),
      buildStation(3, '田町', StopCondition.All, 'JY-27'),
    ]);

    expect(getByText('品川')).toBeTruthy();
    expect(getByText('新橋')).toBeTruthy();
    expect(getByText('田町')).toBeTruthy();
    expect(getByText('JY-25')).toBeTruthy();
    expect(getByText('JY-27')).toBeTruthy();
    // 「通過」ラベルは表示しない
    expect(queryByText('passStationLabel')).toBeNull();
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

    // 発車済みの先頭駅は縦棒・ドットが淡い色になり、次駅以降は通常色のまま
    expect(
      StyleSheet.flatten(getByTestId('stop-dot-1').props.style).borderColor
    ).not.toBe(yamanoteLine.color);
    expect(
      StyleSheet.flatten(getByTestId('stop-dot-2').props.style).borderColor
    ).toBe(yamanoteLine.color);
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

  it('停車中も現在駅より前の駅(過ぎた線路)は半透明になる', () => {
    const { getByTestId } = renderWithStations(
      [
        buildStation(1, '品川', StopCondition.All, 'JY-25'),
        buildStation(2, '田町', StopCondition.All, 'JY-27'),
        buildStation(3, '浜松町', StopCondition.All, 'JY-28'),
      ],
      {
        arrived: true,
        currentStation: buildStation(2, '田町', StopCondition.All),
      }
    );

    // 現在駅(田町)より前の品川は淡色、現在駅と以降は通常色
    expect(
      StyleSheet.flatten(getByTestId('stop-dot-1').props.style).borderColor
    ).not.toBe(yamanoteLine.color);
    expect(
      StyleSheet.flatten(getByTestId('stop-dot-2').props.style).borderColor
    ).toBe(yamanoteLine.color);
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
    // ナンバリングありのときは駅名スロットに記号との間隔パディングが付く
    expect(
      StyleSheet.flatten(getByTestId('portrait-station-name-slot').props.style)
        .paddingLeft
    ).toBe(8);
  });

  it('現在駅にナンバリングがないときは枠を確保せず駅名表示に充てる', () => {
    mockedUseHeaderCommonData.mockReturnValue({
      ...commonData,
      currentStationNumber: null,
    });

    const { queryByTestId, getByTestId } = renderWithStations([
      buildStation(1, '品川', StopCondition.All),
    ]);

    expect(queryByTestId('numbering-column')).toBeNull();
    // 記号との間隔用パディングも付かず、駅名スロットが左端から始まる
    expect(
      StyleSheet.flatten(getByTestId('portrait-station-name-slot').props.style)
        .paddingLeft
    ).toBeUndefined();
  });

  it('ピンより前の駅は淡色になり、ピンの行とそれ以降は通常色のまま', () => {
    const { getByTestId } = renderWithStations(
      [
        buildStation(1, '光が丘', StopCondition.All, 'E-38'),
        buildStation(2, '練馬春日町', StopCondition.All, 'E-37'),
        buildStation(3, '豊島園', StopCondition.All, 'E-36'),
      ],
      // 光が丘を発車し練馬春日町へ走行中(ピンは練馬春日町の行)
      {
        arrived: false,
        currentStation: buildStation(1, '光が丘', StopCondition.All),
      }
    );

    // ピンより前(光が丘)は上下とも淡色。ピンの行(練馬春日町)は通常色のまま。
    expect(
      StyleSheet.flatten(getByTestId('track-top-1').props.style).backgroundColor
    ).not.toBe(yamanoteLine.color);
    expect(
      StyleSheet.flatten(getByTestId('track-bottom-1').props.style)
        .backgroundColor
    ).not.toBe(yamanoteLine.color);
    expect(
      StyleSheet.flatten(getByTestId('track-top-2').props.style).backgroundColor
    ).toBe(yamanoteLine.color);
  });

  it('停車中(CURRENT)の英中韓 state は各言語の「ただいま停車中」を補完表示する', () => {
    mockedUseHeaderCommonData.mockReturnValue({
      ...commonData,
      stateText: '',
      headerState: 'CURRENT_EN',
    });

    const { getByText } = renderWithStations([
      buildStation(1, '品川', StopCondition.All, 'JY-25'),
    ]);

    // translate はモックでキーをそのまま返す
    expect(getByText('nowStoppingAtEn')).toBeTruthy();
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

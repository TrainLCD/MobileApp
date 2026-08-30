import { fireEvent, render, within } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import { getLuminance } from 'polished';
import { StyleSheet } from 'react-native';
import { type Line, type Station, StopCondition } from '~/@types/graphql';
import { DARK_APP_COLORS, LIGHT_APP_COLORS } from '~/constants/colorScheme';
import {
  useCurrentLine,
  useCurrentStation,
  useCurrentTrainType,
  useEstimatedMinutesByStationId,
  useHeaderCommonData,
  useTransferLines,
  useTransferLinesFromStation,
  useTransferTargetStation,
} from '~/hooks';
import { COLOR_SCHEME_PREFERENCE } from '~/models/ColorScheme';
import { colorSchemePreferenceAtom } from '~/store/atoms/colorScheme';
import { bottomStateAtom } from '~/store/atoms/navigation';
import {
  arrivedAtom,
  selectedDirectionAtom,
  stationsAtom,
} from '~/store/atoms/station';
import { translate } from '~/translation';
import { RFValue } from '~/utils/rfValue';
import PortraitMain from './PortraitMain';

jest.mock('~/translation', () => ({
  isJapanese: true,
  translate: jest.fn((key: string) => key),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({
    top: 59,
    right: 0,
    bottom: 34,
    left: 0,
  })),
}));

jest.mock('./NumberingIcon', () => () => null);

jest.mock('~/hooks', () => ({
  useBoundText: jest.fn(() => ({ JA: '品川・大崎方面' })),
  useCurrentLine: jest.fn(),
  useCurrentStation: jest.fn(),
  useCurrentTrainType: jest.fn(),
  useEstimateArrivalTimesAllStops: jest.fn(() => ({
    route: null,
    loading: false,
    error: null,
  })),
  useEstimatedMinutesByStationId: jest.fn(() => new Map<number, number>()),
  useGetLineMark: jest.fn(() => () => null),
  useHeaderCommonData: jest.fn(),
  useStationNumberIndexFunc: jest.fn(() => () => 0),
  useTransferLines: jest.fn(() => []),
  useTransferLinesFromStation: jest.fn(() => []),
  useTransferStationNumbers: jest.fn((lines: Line[]) => lines.map(() => null)),
  useTransferTargetStation: jest.fn(() => undefined),
}));

const mockedUseHeaderCommonData = useHeaderCommonData as jest.Mock;
const mockedUseCurrentLine = useCurrentLine as jest.Mock;
const mockedUseCurrentStation = useCurrentStation as jest.Mock;
const mockedUseCurrentTrainType = useCurrentTrainType as jest.Mock;
const mockedUseTransferLinesFromStation =
  useTransferLinesFromStation as jest.Mock;
const mockedUseTransferLines = useTransferLines as jest.Mock;
const mockedUseTransferTargetStation = useTransferTargetStation as jest.Mock;
const mockedUseEstimatedMinutesByStationId =
  useEstimatedMinutesByStationId as jest.Mock;

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
  headerState: 'NEXT_KANA',
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
    colorScheme = COLOR_SCHEME_PREFERENCE.LIGHT,
    bottomState = 'LINE' as const,
    transferStation,
    onPress,
    onTransferPress,
  }: {
    arrived?: boolean;
    currentStation?: Station;
    colorScheme?: (typeof COLOR_SCHEME_PREFERENCE)[keyof typeof COLOR_SCHEME_PREFERENCE];
    bottomState?: 'LINE' | 'TRANSFER' | 'TYPE_CHANGE';
    transferStation?: Station;
    onPress?: () => void;
    onTransferPress?: (station?: Station) => void;
  } = {}
) => {
  const store = createStore();
  // 端末のダークモード状態に左右されないよう、配色は常に明示して固定する
  store.set(colorSchemePreferenceAtom, colorScheme);
  // 全駅表示。INBOUND は反転しないので渡した順がそのまま表示順になる。
  store.set(stationsAtom, stations);
  store.set(selectedDirectionAtom, 'INBOUND');
  store.set(arrivedAtom, arrived);
  store.set(bottomStateAtom, bottomState);
  mockedUseCurrentStation.mockReturnValue(currentStation);
  mockedUseTransferTargetStation.mockReturnValue(transferStation);

  return render(
    <Provider store={store}>
      <PortraitMain onPress={onPress} onTransferPress={onTransferPress} />
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
    mockedUseTransferLines.mockReturnValue([]);
    mockedUseTransferTargetStation.mockReturnValue(undefined);
    mockedUseEstimatedMinutesByStationId.mockReturnValue(
      new Map<number, number>()
    );
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

    // スロット幅 300 に対し自然幅 200 ならバッファ込み 216 でも収まる
    fireEvent(getByTestId('portrait-station-name-slot'), 'layout', {
      nativeEvent: { layout: { width: 300 } },
    });
    fireEvent(getByTestId('portrait-station-name-measure'), 'textLayout', {
      nativeEvent: { lines: [{ width: 200 }] },
    });

    const style = StyleSheet.flatten(
      getByTestId('portrait-station-name').props.style
    );
    expect(style.width).toBe(216);
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
    // 描画幅 = 392 + 16(バッファ) = 408、利用可能幅 = 108 - 8 = 100
    expect(style.width).toBe(408);
    expect(style.transform).toEqual([{ scaleX: 100 / 408 }]);
    // 左端基準で圧縮する。数値配列形式 [x, y, z] で指定し、New Architecture でも
    // 確実に左端アンカーになるようにする(2 値キーワード文字列は中央へフォールバックする)。
    expect(style.transformOrigin).toEqual([0, '50%', 0]);
  });

  it('停車駅リストに通過駅も含めて駅名とナンバリングを表示する', () => {
    const { getByText } = renderWithStations([
      buildStation(1, '品川', StopCondition.All, 'JY-25'),
      buildStation(2, '新橋', StopCondition.Not, 'JY-26'),
      buildStation(3, '田町', StopCondition.All, 'JY-27'),
    ]);

    expect(getByText('品川')).toBeTruthy();
    expect(getByText('新橋')).toBeTruthy();
    expect(getByText('田町')).toBeTruthy();
    expect(getByText('JY-25')).toBeTruthy();
    expect(getByText('JY-27')).toBeTruthy();
    // 通過駅であることは行内の「通過」ラベルでも示す
    expect(getByText('portraitPassLabel')).toBeTruthy();
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
      RFValue(15)
    );
    expect(StyleSheet.flatten(getByText('品川').props.style).fontSize).toBe(
      RFValue(14)
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
      RFValue(15)
    );
    // 列車位置のピンは現在駅の行に出る
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

  it('上端は Dynamic Island、下端はホームインジケータと被らないようセーフエリア分の余白を取る', () => {
    const { getByTestId } = renderWithStations([
      buildStation(1, '品川', StopCondition.All, 'JY-25'),
    ]);

    // 上端: 路線セクションが Dynamic Island に潜らないよう root に paddingTop
    expect(
      StyleSheet.flatten(getByTestId('portrait-root').props.style).paddingTop
    ).toBe(59);
    // 下端: スクロール末尾でも最終駅がホームインジケータに被らないよう
    // リスト内容に通常の下パディング + セーフエリア下端を足す
    expect(
      StyleSheet.flatten(
        getByTestId('portrait-stop-list').props.contentContainerStyle
      ).paddingBottom
    ).toBe(12 + 34);
  });

  it('ヘッダーデータが揃っていない間は何も表示しない', () => {
    mockedUseHeaderCommonData.mockReturnValue(null);

    const { queryByText } = renderWithStations([
      buildStation(1, '品川', StopCondition.All, 'JY-25'),
    ]);

    expect(queryByText('山手線')).toBeNull();
    expect(queryByText('品川')).toBeNull();
  });
  it('通過駅の行は停車駅の行より低く、同じ画面高でより多くの駅を見せる', () => {
    const { getByTestId } = renderWithStations([
      buildStation(1, '品川', StopCondition.All, 'JY-25'),
      buildStation(2, '新橋', StopCondition.Not, 'JY-26'),
    ]);

    const stopHeight = StyleSheet.flatten(getByTestId('stop-row-1').props.style)
      .minHeight as number;
    const passHeight = StyleSheet.flatten(getByTestId('stop-row-2').props.style)
      .minHeight as number;
    expect(passHeight).toBeLessThan(stopHeight);
  });

  it('ライト設定では地・カード・本文にライトのトークンを使う', () => {
    const { getByTestId } = renderWithStations([
      buildStation(1, '品川', StopCondition.All, 'JY-25'),
    ]);

    expect(
      StyleSheet.flatten(getByTestId('portrait-root').props.style)
        .backgroundColor
    ).toBe(LIGHT_APP_COLORS.background);
    expect(
      StyleSheet.flatten(getByTestId('portrait-station-card').props.style)
        .backgroundColor
    ).toBe(LIGHT_APP_COLORS.card);
    expect(
      StyleSheet.flatten(getByTestId('portrait-station-name').props.style).color
    ).toBe(LIGHT_APP_COLORS.text);
  });

  it('ダーク設定では地・カード・本文がダークのトークンへ切り替わる', () => {
    const { getByTestId } = renderWithStations(
      [buildStation(1, '品川', StopCondition.All, 'JY-25')],
      { colorScheme: COLOR_SCHEME_PREFERENCE.DARK }
    );

    expect(
      StyleSheet.flatten(getByTestId('portrait-root').props.style)
        .backgroundColor
    ).toBe(DARK_APP_COLORS.background);
    expect(
      StyleSheet.flatten(getByTestId('portrait-station-card').props.style)
        .backgroundColor
    ).toBe(DARK_APP_COLORS.card);
    expect(
      StyleSheet.flatten(getByTestId('portrait-station-name').props.style).color
    ).toBe(DARK_APP_COLORS.text);
  });

  it('ダークでは沈まないよう路線色の明度を上げた色で線路を描く', () => {
    const { getByTestId } = renderWithStations(
      [buildStation(1, '品川', StopCondition.All, 'JY-25')],
      { colorScheme: COLOR_SCHEME_PREFERENCE.DARK }
    );

    const trackColor = StyleSheet.flatten(
      getByTestId('track-bottom-1').props.style
    ).backgroundColor as string;

    expect(trackColor).not.toBe(yamanoteLine.color);
    // 暗い地から浮くよう、元の路線色より明るい色になっている
    expect(getLuminance(trackColor)).toBeGreaterThan(
      getLuminance(yamanoteLine.color)
    );
  });

  it('進捗バーは走行→接近→停車の順に伸び、停車で満ちる', () => {
    const widthFor = (headerState: string) => {
      mockedUseHeaderCommonData.mockReturnValue({ ...commonData, headerState });
      const { getByTestId, unmount } = renderWithStations([
        buildStation(1, '品川', StopCondition.All, 'JY-25'),
      ]);
      const width = StyleSheet.flatten(
        getByTestId('portrait-progress-fill').props.style
      ).width as string;
      unmount();
      return Number.parseFloat(width);
    };

    const next = widthFor('NEXT_KANA');
    const arriving = widthFor('ARRIVING_KANA');
    const current = widthFor('CURRENT_KANA');

    expect(next).toBeLessThan(arriving);
    expect(arriving).toBeLessThan(current);
    expect(current).toBe(100);
  });

  it('停車中はカードの脇に起点の駅と次の停車駅を出す。次がなければ出さない', () => {
    const { getByText } = renderWithStations([
      buildStation(1, '品川', StopCondition.All, 'JY-25'),
      buildStation(2, '新橋', StopCondition.Not, 'JY-26'),
      buildStation(3, '田町', StopCondition.All, 'JY-27'),
    ]);
    // 通過駅の新橋は飛ばして田町が次の停車駅になる。どの駅を起点にした「つぎ」
    // なのかが読み取れるよう、現在駅(品川)も添えて出す。
    expect(getByText('portraitNextStopFrom')).toBeTruthy();
    expect(translate).toHaveBeenCalledWith('portraitNextStopFrom', {
      current: '品川',
      station: '田町',
    });

    const { queryByTestId } = renderWithStations([
      buildStation(1, '品川', StopCondition.All, 'JY-25'),
    ]);
    expect(queryByTestId('portrait-card-meta')).toBeNull();
  });

  it('通過駅を最寄りにしている間はその駅を通過中として出す', () => {
    const { getByText } = renderWithStations(
      [
        buildStation(1, '品川', StopCondition.All, 'JY-25'),
        buildStation(2, '新橋', StopCondition.Not, 'JY-26'),
        buildStation(3, '田町', StopCondition.All, 'JY-27'),
      ],
      {
        arrived: false,
        currentStation: buildStation(2, '新橋', StopCondition.Not, 'JY-26'),
      }
    );

    // カードは次の停車駅(田町)を出しているので、通過駅の名前はここにしか出ない
    expect(getByText('portraitPassThrough')).toBeTruthy();
    expect(translate).toHaveBeenCalledWith('portraitPassThrough', {
      station: '新橋',
    });
  });

  it('最終駅を発車済み扱いのまま留まってもピンが消えず全行が淡色にならない', () => {
    // arrived が false の間 useRefreshStation は現在駅を進めないため、終点に着いた
    // あと到着判定が外れると「最終駅にいて未到着」という状態が続く。素直に次駅へ
    // 進めるとピンが範囲外へ出て、全行が発車済みの淡色になってしまう。
    const { getByTestId } = renderWithStations(
      [
        buildStation(1, '品川', StopCondition.All, 'JY-25'),
        buildStation(2, '田町', StopCondition.All, 'JY-27'),
      ],
      {
        arrived: false,
        currentStation: buildStation(2, '田町', StopCondition.All),
      }
    );

    // 列車ピンは最終駅の行に残る
    expect(
      within(getByTestId('stop-row-2')).getByTestId('train-chevron')
    ).toBeTruthy();
    // 最終駅の行は発車済みの淡色にしない
    expect(
      StyleSheet.flatten(getByTestId('stop-body-2').props.style).opacity
    ).toBeUndefined();
  });

  it('停車駅を発車して次の停車駅へ向かっている間は注記を出さない', () => {
    // まだ通過していない駅を「通過中」と予告してしまわないよう、最寄りが停車駅の
    // 間は先の通過駅(新橋)には触れない。
    const { queryByTestId } = renderWithStations(
      [
        buildStation(1, '品川', StopCondition.All, 'JY-25'),
        buildStation(2, '新橋', StopCondition.Not, 'JY-26'),
        buildStation(3, '田町', StopCondition.All, 'JY-27'),
      ],
      { arrived: false }
    );

    expect(queryByTestId('portrait-card-meta')).toBeNull();
  });

  describe('各駅のETA', () => {
    // 品川(現在駅) → 新橋(通過) → 田町 → 浜松町
    const etaStations = () => [
      buildStation(1, '品川', StopCondition.All, 'JY-25'),
      buildStation(2, '新橋', StopCondition.Not, 'JY-26'),
      buildStation(3, '田町', StopCondition.All, 'JY-27'),
      buildStation(4, '浜松町', StopCondition.All, 'JY-28'),
    ];

    it('ETAのある停車駅に残り分と単位を出す', () => {
      mockedUseEstimatedMinutesByStationId.mockReturnValue(
        new Map([
          [3, 4],
          [4, 11],
        ])
      );

      const { getByTestId } = renderWithStations(etaStations());

      expect(within(getByTestId('stop-eta-3')).getByText('4')).toBeTruthy();
      expect(within(getByTestId('stop-eta-4')).getByText('11')).toBeTruthy();
      // 単位は全行に添える
      expect(
        within(getByTestId('stop-eta-3')).getByText('portraitEtaUnit')
      ).toBeTruthy();
      expect(
        within(getByTestId('stop-eta-4')).getByText('portraitEtaUnit')
      ).toBeTruthy();
    });

    it('小数のETAは分に丸めて出す', () => {
      mockedUseEstimatedMinutesByStationId.mockReturnValue(new Map([[3, 4.6]]));

      const { getByTestId } = renderWithStations(etaStations());

      expect(within(getByTestId('stop-eta-3')).getByText('5')).toBeTruthy();
    });

    it('丸めて0分になる駅は数字ではなく「まもなく」を出す', () => {
      // 0分と出すと「もう着いた」と読めてしまうため
      mockedUseEstimatedMinutesByStationId.mockReturnValue(new Map([[3, 0.4]]));

      const { getByTestId } = renderWithStations(etaStations());

      expect(
        within(getByTestId('stop-eta-3')).getByText('portraitEtaSoon')
      ).toBeTruthy();
      expect(
        within(getByTestId('stop-eta-3')).queryByText('portraitEtaUnit')
      ).toBeNull();
    });

    it('ETAが取れている路線では、値の無い停車駅にもプレースホルダを出して桁位置を揃える', () => {
      mockedUseEstimatedMinutesByStationId.mockReturnValue(new Map([[3, 4]]));

      const { getByTestId } = renderWithStations(etaStations());

      expect(within(getByTestId('stop-eta-4')).getByText('--')).toBeTruthy();
    });

    it('通過駅にはETAを出さない', () => {
      mockedUseEstimatedMinutesByStationId.mockReturnValue(new Map([[3, 4]]));

      const { queryByTestId } = renderWithStations(etaStations());

      expect(queryByTestId('stop-eta-2')).toBeNull();
    });

    it('停車中の駅と発車済みの駅には列を出さない', () => {
      // これらの駅は相対値が0以下になり変換側で落ちるため、列を出すと
      // 「--」だけが並ぶ。品川を発車済みなので品川・新橋には出さない。
      mockedUseEstimatedMinutesByStationId.mockReturnValue(
        new Map([
          [3, 4],
          [4, 11],
        ])
      );

      const { queryByTestId } = renderWithStations(etaStations(), {
        arrived: false,
      });

      expect(queryByTestId('stop-eta-1')).toBeNull();
      expect(queryByTestId('stop-eta-3')).toBeTruthy();
    });

    it('ETAの値がすべて null のときは列ごと出さない', () => {
      // stops は揃っていても cumulativeMinutes が全部 null の応答がある。
      // 件数だけで判定すると「--」だけの列が出てしまう。
      mockedUseEstimatedMinutesByStationId.mockReturnValue(
        new Map<number, number | null>([
          [3, null],
          [4, null],
        ])
      );

      const { queryByTestId } = renderWithStations(etaStations());

      expect(queryByTestId('stop-eta-3')).toBeNull();
      expect(queryByTestId('stop-eta-4')).toBeNull();
    });

    it('ETAが1駅も取れないときは列ごと出さない', () => {
      // 全行に「--」が並び続けるより、右端を今までどおり空けておく
      mockedUseEstimatedMinutesByStationId.mockReturnValue(
        new Map<number, number>()
      );

      const { queryByTestId } = renderWithStations(etaStations());

      expect(queryByTestId('stop-eta-3')).toBeNull();
      expect(queryByTestId('stop-eta-4')).toBeNull();
    });

    it('次の停車駅のETAだけ路線色で一回り大きく出す', () => {
      mockedUseEstimatedMinutesByStationId.mockReturnValue(
        new Map([
          [3, 4],
          [4, 11],
        ])
      );

      // 品川を発車済みなので、次の停車駅は通過駅の新橋を挟んだ田町になる
      const { getByTestId } = renderWithStations(etaStations(), {
        arrived: false,
      });

      const focused = StyleSheet.flatten(
        within(getByTestId('stop-eta-3')).getByText('4').props.style
      );
      expect(focused.fontSize).toBe(RFValue(15));
      expect(focused.color).toBe('#80C241');

      const rest = StyleSheet.flatten(
        within(getByTestId('stop-eta-4')).getByText('11').props.style
      );
      expect(rest.fontSize).toBe(RFValue(13));
      expect(rest.color).toBe(LIGHT_APP_COLORS.secondaryText);
    });
  });

  describe('のりかえ案内', () => {
    const shinjuku = buildStation(100, '新宿', StopCondition.All, 'JC-05');
    const shinsenShinjuku = buildStation(200, '新線新宿', StopCondition.All);

    const buildTransferLine = (
      id: number,
      nameShort: string,
      color: string,
      station: Station
    ): Line =>
      ({
        id,
        nameShort,
        nameRoman: `${nameShort}-roman`,
        color,
        lineSymbols: [],
        station,
      }) as unknown as Line;

    const yamanote = buildTransferLine(11302, '山手線', '#80C241', shinjuku);
    const keioNew = buildTransferLine(
      99310,
      '京王新線',
      '#CA0073',
      shinsenShinjuku
    );

    it('下部の表示が TRANSFER のときは停車駅リストに重ねてのりかえ案内を出す', () => {
      mockedUseTransferLines.mockReturnValue([yamanote]);

      const { getByTestId, getByText } = renderWithStations([shinjuku], {
        bottomState: 'TRANSFER',
        transferStation: shinjuku,
      });

      expect(getByTestId('portrait-transfers')).toBeTruthy();
      // 見出しは translate('transfer') をそのまま使う
      expect(getByText('transfer')).toBeTruthy();
      // メタ行にも運転中の路線名が出るので、行に絞って確かめる
      expect(
        within(getByTestId('portrait-transfer-row-11302')).getByText('山手線')
      ).toBeTruthy();
      // 案内対象の駅は見出しの脇に出す
      expect(getByTestId('portrait-transfer-station').props.children).toBe(
        '新宿駅'
      );
      // リストは外さずに重ねるだけなので、下のスクロール位置は保たれる
      expect(getByTestId('portrait-stop-list')).toBeTruthy();
    });

    it('乗換路線が無いときは TRANSFER でものりかえ案内を出さない', () => {
      mockedUseTransferLines.mockReturnValue([]);

      const { queryByTestId } = renderWithStations([shinjuku], {
        bottomState: 'TRANSFER',
      });

      expect(queryByTestId('portrait-transfers')).toBeNull();
    });

    it('乗換先が案内中の駅と同じなら駅名を添えず、別の駅のときだけ添える', () => {
      mockedUseTransferLines.mockReturnValue([yamanote, keioNew]);

      const { getByTestId, getAllByText } = renderWithStations([shinjuku], {
        bottomState: 'TRANSFER',
        transferStation: shinjuku,
      });

      // 同じ新宿駅なので、山手線の行には駅名を出さない
      expect(
        within(getByTestId('portrait-transfer-row-11302')).queryByText('新宿駅')
      ).toBeNull();
      // 新線新宿は別の駅なので添える
      expect(
        within(getByTestId('portrait-transfer-row-99310')).getByText(
          '新線新宿駅'
        )
      ).toBeTruthy();
      // 「新宿駅」は見出しの脇だけ。行に同じ駅名が重ねて出ていないこと
      expect(getAllByText('新宿駅')).toHaveLength(1);
    });

    it('上部の路線情報・カードのタップで下部の表示を進める', () => {
      const onPress = jest.fn();
      const { getByTestId } = renderWithStations([shinjuku], { onPress });

      fireEvent.press(getByTestId('portrait-header-tap'));

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('停車駅リストのタップでも下部の表示を進める', () => {
      const onPress = jest.fn();
      const { getByTestId } = renderWithStations([shinjuku], { onPress });

      fireEvent.press(getByTestId('portrait-stop-list-tap'));

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('のりかえ一覧の余白タップは駅なしで渡す(横画面と同じく表示が進む)', () => {
      mockedUseTransferLines.mockReturnValue([yamanote]);
      const onTransferPress = jest.fn();
      const { getByTestId } = renderWithStations([shinjuku], {
        bottomState: 'TRANSFER',
        transferStation: shinjuku,
        onTransferPress,
      });

      fireEvent.press(getByTestId('portrait-transfer-list-tap'));

      expect(onTransferPress).toHaveBeenCalledTimes(1);
      expect(onTransferPress).toHaveBeenCalledWith(undefined);
    });

    it('のりかえ行タップでは路線と駅を渡し、表示は進めない', () => {
      mockedUseTransferLines.mockReturnValue([yamanote]);
      const onPress = jest.fn();
      const onTransferPress = jest.fn();

      const { getByTestId } = renderWithStations([shinjuku], {
        bottomState: 'TRANSFER',
        transferStation: shinjuku,
        onPress,
        onTransferPress,
      });

      fireEvent.press(getByTestId('portrait-transfer-row-11302'));

      expect(onTransferPress).toHaveBeenCalledTimes(1);
      expect(onTransferPress.mock.calls[0][0]).toMatchObject({
        groupId: shinjuku.groupId,
        line: yamanote,
      });
      expect(onPress).not.toHaveBeenCalled();
    });

    it('路線と路線の間に余白を取る', () => {
      mockedUseTransferLines.mockReturnValue([yamanote, keioNew]);

      const { getByTestId } = renderWithStations([shinjuku], {
        bottomState: 'TRANSFER',
        transferStation: shinjuku,
      });

      // 行の直接の親はタップ領域の Pressable。ScrollView の
      // contentContainerStyle に置いても行間には入らない。
      const style = StyleSheet.flatten(
        getByTestId('portrait-transfer-list-tap').props.style
      );
      expect(style.rowGap).toBeGreaterThan(0);
    });

    it('のりかえ一覧をスクロールした指では表示を進めない', () => {
      mockedUseTransferLines.mockReturnValue([yamanote]);
      const onTransferPress = jest.fn();

      const { getByTestId } = renderWithStations([shinjuku], {
        bottomState: 'TRANSFER',
        transferStation: shinjuku,
        onTransferPress,
      });

      fireEvent(getByTestId('portrait-transfer-list'), 'scrollBeginDrag');
      fireEvent.press(getByTestId('portrait-transfer-list-tap'));

      expect(onTransferPress).not.toHaveBeenCalled();
    });

    it('のりかえ一覧をスクロールした指では路線変更へ渡さない', () => {
      mockedUseTransferLines.mockReturnValue([yamanote]);
      const onTransferPress = jest.fn();

      const { getByTestId } = renderWithStations([shinjuku], {
        bottomState: 'TRANSFER',
        transferStation: shinjuku,
        onTransferPress,
      });

      fireEvent(getByTestId('portrait-transfer-list'), 'scrollBeginDrag');
      fireEvent.press(getByTestId('portrait-transfer-row-11302'));

      expect(onTransferPress).not.toHaveBeenCalled();
    });

    it('停車駅リストをスクロールした指でも表示を進めない', () => {
      const onPress = jest.fn();

      const { getByTestId } = renderWithStations([shinjuku], { onPress });

      fireEvent(getByTestId('portrait-stop-list'), 'scrollBeginDrag');
      fireEvent.press(getByTestId('portrait-stop-list-tap'));

      expect(onPress).not.toHaveBeenCalled();
    });

    it('指を置き直せばスクロール後でもタップは効く', () => {
      const onPress = jest.fn();

      const { getByTestId } = renderWithStations([shinjuku], { onPress });

      fireEvent(getByTestId('portrait-stop-list'), 'scrollBeginDrag');
      // 指を離して置き直したところからは、また普通のタップとして扱う
      fireEvent(getByTestId('portrait-root'), 'touchStart');
      fireEvent.press(getByTestId('portrait-stop-list-tap'));

      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });
});

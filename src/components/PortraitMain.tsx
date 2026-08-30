import { LinearGradient } from 'expo-linear-gradient';
import { useAtomValue } from 'jotai';
import {
  darken,
  getLuminance,
  mix,
  parseToHsl,
  rgba,
  setLightness,
} from 'polished';
import type React from 'react';
import { memo, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  type TextLayoutEventData,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Circle,
  Defs,
  Stop as GradientStop,
  Path,
  RadialGradient,
  Rect,
  Svg,
} from 'react-native-svg';
import type { Station } from '~/@types/graphql';
import { parenthesisRegexp } from '~/constants';
import type { AppColors } from '~/constants/colorScheme';
import {
  useBoundText,
  useCurrentLine,
  useCurrentStation,
  useCurrentTrainType,
  useHeaderCommonData,
  useStationNumberIndexFunc,
  useTransferLinesFromStation,
} from '~/hooks';
import { appColorsAtom } from '~/store/atoms/colorScheme';
import {
  arrivedAtom,
  selectedDirectionAtom,
  stationsAtom,
} from '~/store/atoms/station';
import { isJapanese, translate } from '~/translation';
import dropEitherJunctionStation from '~/utils/dropJunctionStation';
import getIsPass from '~/utils/isPass';
import isTablet from '~/utils/isTablet';
import { RFValue } from '~/utils/rfValue';
import {
  getTrainTypeTextColor,
  normalizeTrainTypeColor,
} from '~/utils/trainTypeTextColor';
import NumberingIcon from './NumberingIcon';
import Typography from './Typography';

// 走行画面は AppColorsProvider の外側で描画されるため useAppColors() は常に
// ライトの値を返す。ポートレートは配色設定に追従させたいので atom を直接読む。
// 電光掲示板風テーマ選択中は appColorsAtom がライトを返すので、従来どおりの
// 見た目のまま保たれる。
const FALLBACK_ACCENT = '#888888';

// 通過駅の駅名・記号用。停車駅(secondaryText)よりさらに弱くして
// 「停まらない駅」であることを色の淡さで示す。ダークは既存トークンを流用する。
const PASS_TEXT_LIGHT = '#C2C2C2';
const passTextColor = (colors: AppColors): string =>
  colors.isDark ? colors.strongBorder : PASS_TEXT_LIGHT;

// 白基調の地の上に文字色として置いても読めるよう、明るい路線色は暗めに倒す。
const LIGHT_ACCENT_MAX_LUMINANCE = 0.5;

// 暗い地の上では逆に路線色が沈むため、HSL の明度に下限を設けて起こす。
// 輝度ではなく明度で測って明度を直すのは、変換の前後が同じ尺度で読めるため。
const DARK_ACCENT_MIN_LIGHTNESS = 0.62;

const readableAccentColor = (color: string): string => {
  try {
    return getLuminance(color) > LIGHT_ACCENT_MAX_LUMINANCE
      ? darken(0.25, color)
      : color;
  } catch {
    return FALLBACK_ACCENT;
  }
};

const luminousAccentColor = (color: string): string => {
  try {
    const { lightness } = parseToHsl(color);
    return lightness >= DARK_ACCENT_MIN_LIGHTNESS
      ? color
      : setLightness(DARK_ACCENT_MIN_LIGHTNESS, color);
  } catch {
    return FALLBACK_ACCENT;
  }
};

/** 配色スキームに合わせて地の上で読める路線色に直す */
export const accentColorFor = (color: string, isDark: boolean): string =>
  isDark ? luminousAccentColor(color) : readableAccentColor(color);

// 発車済み区間の縦棒・ドット用に地へ寄せた色。opacity で半透明フェードすると
// 縦棒とリングの重なり部分だけ二重合成で濃くなって不自然なので、不透明のまま
// フェードした色を使う。路線色を残したまま薄めるので直通先の識別も保たれる。
const DEPARTED_TRACK_MIX = 0.4;
const departedTrackColor = (accent: string, background: string): string => {
  try {
    return mix(DEPARTED_TRACK_MIX, accent, background);
  } catch {
    return background;
  }
};

// 停車中(CURRENT)の state は共有の useHeaderStateText では日本語以外が空になる
// (ヘッダーは駅名のみ表示する仕様)。ポートレートでは各言語の「ただいま停車中」を
// 補完して、停車中でも英中韓の state を表示する。
const resolveStateText = (stateText: string, headerState: string): string => {
  if (stateText) {
    return stateText;
  }
  switch (headerState) {
    case 'CURRENT_EN':
      return translate('nowStoppingAtEn');
    case 'CURRENT_ZH':
      return translate('nowStoppingAtZh');
    case 'CURRENT_KO':
      return translate('nowStoppingAtKo');
    default:
      return stateText;
  }
};

// 駅間の進み具合。実際の距離ではなくヘッダーの遷移状態から3段階で出す。
// 「次は」→ 出たばかり、「まもなく」→ 接近、「ただいま停車中」→ 到着で満ちる。
const PROGRESS_NEXT = 0.3;
const PROGRESS_ARRIVING = 0.72;
const PROGRESS_CURRENT = 1;
const progressForState = (headerState: string): number => {
  if (headerState.startsWith('CURRENT')) {
    return PROGRESS_CURRENT;
  }
  if (headerState.startsWith('ARRIVING')) {
    return PROGRESS_ARRIVING;
  }
  return PROGRESS_NEXT;
};

// 画面端からリストまでの左右余白。カードはこれより内側に置いて地から浮かせる。
const CONTENT_INSET = 24;
const CARD_INSET = 20;

// NumberingIcon の LARGE サイズ実寸(NumberingIconRound 基準)に合わせた固定幅。
// ナンバリングがある駅では駅名の長さで記号の表示位置が動かないよう
// 駅名行の左端に固定幅の枠を確保する。ナンバリングがない駅では枠ごと
// 描画せず、その分を駅名表示に充てる。行の minHeight にも流用し、
// ナンバリングの有無でカードの高さが変わらないようにする。
const NUMBERING_COLUMN_WIDTH = isTablet ? 72 * 1.5 : 72;

// 日本語グリフでネイティブのテキスト計測幅がわずかに過小評価されると、
// 表示用 Typography に計測幅ぴったりの width を与えたとき末尾の文字が
// 欠ける。HeaderStationName と同じく計測幅にこの分を加えて余白を確保する。
const STATION_NAME_MEASURE_BUFFER = 16;

// 駅名の自然幅を測る非表示コンテナの幅。どんなに長い駅名でも打ち切られない
// よう十分大きく取る。フォールバック計測でこの値以上なら未確定とみなす。
const STATION_NAME_MEASURE_WIDTH = 10000;

// 縦の路線図。列幅と線の太さ
const RAIL_COLUMN_WIDTH = 32;
const RAIL_LINE_WIDTH = 6;

// 行の高さ。通過駅を低くして、同じ画面高でより多くの駅を見せる
const STOP_ROW_HEIGHT = 52;
const PASS_ROW_HEIGHT = 36;

// 駅の丸。強調(次の停車駅・停車中の駅)だけ一回り大きくする
const STOP_DOT_SIZE = 14;
const STOP_DOT_BORDER = 4;
const FOCUS_DOT_SIZE = 18;
const FOCUS_DOT_BORDER = 5;
const PASS_DOT_SIZE = 6;

// 列車位置ピンの実寸。viewBox 28x37 を縮めて使う
const MARKER_WIDTH = 20;
const MARKER_HEIGHT = 26;
// ピンの円中心(viewBox 上の cy=14)を縮小後の座標に直した値。
// 走行中はこの分だけ持ち上げて、円中心をセグメント上端(=発車済みとの境界)に合わせる。
const MARKER_HEAD_OFFSET = Math.round((14 / 37) * MARKER_HEIGHT);

// 停車駅リストの上下パディング
const STOP_LIST_PADDING_V = 12;

// リスト下端のフェード。最終行がホームインジケータへ溶けるようにする
const LIST_FADE_HEIGHT = 72;

// 現在地まわりに敷く路線色のにじみ。ダークでは発光、ライトでは淡い染みに見える
const WASH_WIDTH = 430;
const WASH_HEIGHT = 380;
const WASH_LEFT = -60;
const WASH_OPACITY_DARK = 0.16;
const WASH_OPACITY_LIGHT = 0.07;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  wash: {
    position: 'absolute',
    top: 0,
    left: WASH_LEFT,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: CONTENT_INSET,
  },
  lineColorBar: {
    width: 4,
    height: RFValue(13),
    borderRadius: 2,
  },
  lineName: {
    flexShrink: 1,
    marginLeft: 10,
    fontSize: RFValue(12),
    fontWeight: 'bold',
  },
  trainTypeBadge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 2,
  },
  trainTypeText: {
    fontSize: RFValue(9),
    fontWeight: 'bold',
  },
  metaSpacer: {
    flex: 1,
    minWidth: 8,
  },
  // 行き先は言語切り替えタイマーで内容が変わる。和文と欧文でフォントメトリクスが
  // 異なり行の高さが変動するため、高さと lineHeight を固定して行がガタつかないようにする。
  boundText: {
    flexShrink: 1,
    fontSize: RFValue(10),
    fontWeight: 'bold',
    height: RFValue(15),
    lineHeight: RFValue(15),
  },
  card: {
    marginTop: 18,
    marginHorizontal: CARD_INSET,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // 状態テキストも言語切り替えで内容が変わるため高さを固定する
  stateText: {
    flexShrink: 1,
    fontSize: RFValue(11),
    fontWeight: 'bold',
    letterSpacing: 1.4,
    height: RFValue(17),
    lineHeight: RFValue(17),
  },
  cardHeadRule: {
    flex: 1,
    minWidth: 8,
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 10,
  },
  cardHeadMeta: {
    flexShrink: 1,
    fontSize: RFValue(9),
    fontWeight: 'bold',
  },
  stationNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginTop: 12,
    minHeight: NUMBERING_COLUMN_WIDTH,
  },
  numberingColumn: {
    width: NUMBERING_COLUMN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 駅名スロット。長い駅名はフォントを縮小せず横方向に圧縮(長体)して
  // 1行に収めるため、はみ出しをクリップする。
  stationNameSlot: {
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // ナンバリング記号と駅名の間隔。記号がないときは付けず左端を揃える
  stationNameSlotWithNumbering: {
    paddingLeft: 8,
  },
  stationNameText: {
    fontSize: RFValue(34),
    fontWeight: 'bold',
  },
  // 自然幅の測定専用(非表示)。絶対配置 + 十分広い固定幅 + 左寄せで、親スロットの
  // 幅制約を受けずテキストを省略させずに本来の幅を測る。描画には出さない。
  stationNameMeasure: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: STATION_NAME_MEASURE_WIDTH,
    alignItems: 'flex-start',
    opacity: 0,
  },
  progressTrack: {
    marginTop: 12,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  stopList: {
    flex: 1,
    overflow: 'hidden',
  },
  stopListContent: {
    paddingTop: STOP_LIST_PADDING_V,
    paddingHorizontal: CONTENT_INSET,
  },
  listFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: LIST_FADE_HEIGHT,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  stopRowStop: {
    minHeight: STOP_ROW_HEIGHT,
  },
  // 通過駅は停車駅より低くして、同じ画面高に入る駅数を増やす
  stopRowPass: {
    minHeight: PASS_ROW_HEIGHT,
  },
  // 列車マーカーの行。ピンが前後の行の縦棒より前に出るようにする
  stopRowElevated: {
    zIndex: 2,
  },
  railColumn: {
    width: RAIL_COLUMN_WIDTH,
    alignItems: 'center',
  },
  trackSegment: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  // 行高は小数を含むためセグメント境界が物理ピクセルに揃わず、丸めの
  // 具合で白い継ぎ目が出ることがある。上下1pxずつ食み出させて隣接する
  // セグメント同士を重ね、継ぎ目が出ないようにする。
  // 端は丸めない。セグメントごとに丸めると隣接する丸い端同士が重なり、
  // 行の境目に節が浮き出る(実機で確認)。角のない帯にすると一本に繋がる。
  trackLine: {
    position: 'absolute',
    top: -1,
    bottom: -1,
    width: RAIL_LINE_WIDTH,
  },
  // 列車位置マーカー(丸い頭+下向きの尖り)のコンテナ。絶対配置でセグメントの
  // フロー高さに影響させず、ドット位置をマーカーの有無に依らず一定に保つ。
  trainMarker: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  // 発車後: 上の行との境目(=発車済みと通常色の境界)にピンの円中心を合わせる
  trainMarkerSegmentTop: {
    top: -MARKER_HEAD_OFFSET,
  },
  // 停車中: マーカーの尖り(下端)を現在駅のドットのすぐ上に寄せる
  trainMarkerAboveDot: {
    bottom: 2,
  },
  // 白抜きの穴を縦棒より狭くして、縦棒が穴をまたいでリング(ボーダー)の内側へ
  // 潜り込むようにする。これで縦棒とリングの間に隙間が生じず、縦棒が駅の丸に
  // シームレスに連結する。負マージンで上下セグメントを円の背後まで重ねる。
  stopDot: {
    width: STOP_DOT_SIZE,
    height: STOP_DOT_SIZE,
    borderRadius: STOP_DOT_SIZE / 2,
    borderWidth: STOP_DOT_BORDER,
    marginVertical: -3,
    zIndex: 1,
  },
  // 強調する駅(停車中の駅・次の停車駅)は一回り大きい丸で示す
  focusDot: {
    width: FOCUS_DOT_SIZE,
    height: FOCUS_DOT_SIZE,
    borderRadius: FOCUS_DOT_SIZE / 2,
    borderWidth: FOCUS_DOT_BORDER,
    marginVertical: -4,
    zIndex: 1,
  },
  // 通過駅は縦棒より細い「抜き穴」で表現する。棒をまたぐリングだと
  // 円からはみ出した棒の直線エッジが見えてしまうため、穴を棒の内側に収める。
  passDot: {
    width: PASS_DOT_SIZE,
    height: PASS_DOT_SIZE,
    borderRadius: PASS_DOT_SIZE / 2,
    marginVertical: -3,
    zIndex: 1,
  },
  // 駅名・通過ラベル・乗換ドット・駅番号を1行に横並びにする。旧デザインのように
  // 駅名の下へ絶対配置しないので、次の行の駅名と重ならない。
  stopContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 14,
  },
  stopContentDeparted: {
    opacity: 0.4,
  },
  stopBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stopName: {
    flexShrink: 1,
    fontSize: RFValue(14),
    fontWeight: 'bold',
  },
  stopNameFocused: {
    fontSize: RFValue(15),
  },
  stopNamePass: {
    fontSize: RFValue(11),
    fontWeight: 'normal',
  },
  passLabel: {
    marginLeft: 8,
    fontSize: RFValue(8),
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
  transferDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  transferDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  stopNumber: {
    marginLeft: 8,
    fontSize: RFValue(10),
    fontWeight: 'bold',
    letterSpacing: 0.6,
  },
});

type MarkerPosition = 'above-dot' | 'segment-top' | null;

// 列車位置マーカー(下向きのティアドロップ型ピン)。丸い頭(円)と下の尖りを
// 1つのシルエットとして描く。塗りはラインカラー、地の色で縁取りを付けることで
// 同色の縦棒(trackLine)に尖りが埋もれず、線路上に乗ったピンとして読める。
// 円(head)と尖り(tail)はそれぞれ「地色の大きめ図形→塗りの図形」の2層構成にし、
// 同色図形の重なりで継ぎ目なく融合させつつ、外周だけ地色を覗かせて縁取りにする。
const TrainMarkerPin = ({
  color,
  background,
}: {
  color: string;
  background: string;
}) => (
  <Svg width={MARKER_WIDTH} height={MARKER_HEIGHT} viewBox="0 0 28 37">
    {/* 地色の縁取り層(頭半径13.5・尖りを一回り大きく) */}
    <Circle cx={14} cy={14} r={13.5} fill={background} />
    <Path d="M3.2 21.9 L14 36.6 L24.8 21.9 Z" fill={background} />
    {/* ラインカラーの本体層(頭半径11) */}
    <Circle cx={14} cy={14} r={11} fill={color} />
    <Path d="M4.81 20.05 L14 34 L23.19 20.05 Z" fill={color} />
  </Svg>
);

// 列車位置ピンを軽く拍動(パルス)させ、「いまここを走っている」生きた感じを出す。
// moving(走行中・通過中)のときは上下にバウンスさせ、停車中との違いを動きで示す。
const PULSE_DURATION = 850;
const BOUNCE_DURATION = 500;
const TrainMarker = ({
  color,
  background,
  moving,
}: {
  color: string;
  background: string;
  moving: boolean;
}) => {
  const pulse = useSharedValue(0);
  const bounce = useSharedValue(0);

  // 停車中はパルス(拡大縮小)で「いまここ」を示す。走行中・通過中はパルスを
  // 止めて上下バウンスのみにする。
  useEffect(() => {
    if (moving) {
      cancelAnimation(pulse);
      pulse.value = withTiming(0, { duration: 200 });
      bounce.value = withRepeat(
        withSequence(
          withTiming(1, { duration: BOUNCE_DURATION }),
          withTiming(0, { duration: BOUNCE_DURATION })
        ),
        -1,
        false
      );
    } else {
      cancelAnimation(bounce);
      bounce.value = withTiming(0, { duration: 200 });
      // easing は指定せず Reanimated 既定(inOut quad)に任せる。滑らかな拍動。
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: PULSE_DURATION }),
          withTiming(0, { duration: PULSE_DURATION })
        ),
        -1,
        false
      );
    }
    return () => {
      cancelAnimation(pulse);
      cancelAnimation(bounce);
    };
  }, [moving, pulse, bounce]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: bounce.value * -5 },
      { scale: 1 + pulse.value * 0.12 },
    ],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <TrainMarkerPin color={color} background={background} />
    </Animated.View>
  );
};

const TrackSegment = ({
  color,
  hidden,
  marker = null,
  lineTestID,
  // ピン(列車)の色。縦棒(color)が発車済みで淡色化されても、列車そのものを
  // 表すピンは通常のアクセント色のままにしたいので別に受け取る。
  markerColor,
  markerBackground,
  markerMoving = false,
}: {
  color: string;
  hidden: boolean;
  marker?: MarkerPosition;
  lineTestID?: string;
  markerColor?: string;
  markerBackground?: string;
  markerMoving?: boolean;
}) => (
  <View style={styles.trackSegment}>
    <View
      testID={lineTestID}
      style={[
        styles.trackLine,
        { backgroundColor: color, opacity: hidden ? 0 : 1 },
      ]}
    />
    {/* ピンは絶対配置にしてセグメントのフロー高さに影響させない。これにより
        marker の位置(segment-top/above-dot)が変わってもドット位置は不変。 */}
    {marker ? (
      <View
        style={[
          styles.trainMarker,
          marker === 'segment-top' && styles.trainMarkerSegmentTop,
          marker === 'above-dot' && styles.trainMarkerAboveDot,
        ]}
        testID="train-chevron"
      >
        <TrainMarker
          color={markerColor ?? color}
          background={markerBackground ?? color}
          moving={markerMoving}
        />
      </View>
    ) : null}
  </View>
);

const StopRow = ({
  station,
  colors,
  isFirst,
  isLast,
  isFocused,
  departed,
  marker,
  markerMoving,
  fallbackLineColor,
  elevated,
  onLayoutTop,
}: {
  station: Station;
  colors: AppColors;
  isFirst: boolean;
  isLast: boolean;
  isFocused: boolean;
  departed: boolean;
  marker: MarkerPosition;
  markerMoving: boolean;
  fallbackLineColor: string;
  elevated?: boolean;
  onLayoutTop?: (y: number) => void;
}) => {
  const isPass = getIsPass(station);
  // 直通運転で路線が変わったら縦棒も直通先のラインカラーで塗る
  const lineColor = station.line?.color ?? fallbackLineColor;
  const accentColor = useMemo(
    () => accentColorFor(lineColor, colors.isDark),
    [lineColor, colors.isDark]
  );
  // 列車が過ぎた線路(departed)だけを不透明の淡い色でフェードする(半透明だと
  // 縦棒とリングの重なりが濃くなるため不透明のままフェード)。テキストは
  // stopContent の opacity でフェードする。
  const trackColor = useMemo(
    () =>
      departed
        ? departedTrackColor(accentColor, colors.background)
        : accentColor,
    [departed, accentColor, colors.background]
  );
  const getStationNumberIndex = useStationNumberIndexFunc();
  const transferLines = useTransferLinesFromStation(station, {
    omitRepeatingLine: true,
  });

  const numberingIndex = getStationNumberIndex(station);
  const stationNumber =
    station.stationNumbers?.[numberingIndex]?.stationNumber ?? null;

  const stationName = isJapanese
    ? (station.name ?? '')
    : (station.nameRoman ?? station.name ?? '');

  const passColor = passTextColor(colors);
  const nameColor = isFocused ? accentColor : isPass ? passColor : colors.text;
  const numberColor = isFocused
    ? accentColor
    : isPass
      ? passColor
      : colors.secondaryText;

  return (
    <View
      style={[
        styles.stopRow,
        isPass ? styles.stopRowPass : styles.stopRowStop,
        elevated && styles.stopRowElevated,
      ]}
      testID={`stop-row-${station.id}`}
      onLayout={
        onLayoutTop ? (e) => onLayoutTop(e.nativeEvent.layout.y) : undefined
      }
    >
      <View style={styles.railColumn}>
        {/* 全駅表示なので上側は始発駅(isFirst)、下側は終点(isLast)でのみ
            隠す。中間駅は前後の駅と線が繋がる。 */}
        <TrackSegment
          color={trackColor}
          markerColor={accentColor}
          markerBackground={colors.background}
          markerMoving={markerMoving}
          hidden={isFirst}
          marker={marker}
          lineTestID={`track-top-${station.id}`}
        />
        {isPass ? (
          <View
            style={[styles.passDot, { backgroundColor: colors.background }]}
          />
        ) : (
          <View
            style={[
              isFocused ? styles.focusDot : styles.stopDot,
              { borderColor: trackColor, backgroundColor: colors.background },
            ]}
            testID={`stop-dot-${station.id}`}
          />
        )}
        <TrackSegment
          color={trackColor}
          hidden={isLast}
          lineTestID={`track-bottom-${station.id}`}
        />
      </View>
      <View
        style={[styles.stopContent, departed && styles.stopContentDeparted]}
        testID={`stop-body-${station.id}`}
      >
        <View style={styles.stopBody}>
          <Typography
            numberOfLines={1}
            style={[
              styles.stopName,
              isFocused && styles.stopNameFocused,
              isPass && styles.stopNamePass,
              { color: nameColor },
            ]}
          >
            {stationName}
          </Typography>
          {isPass ? (
            <Typography style={[styles.passLabel, { color: passColor }]}>
              {translate('portraitPassLabel')}
            </Typography>
          ) : null}
          {!isPass && transferLines.length ? (
            <View style={styles.transferDots}>
              {transferLines.slice(0, 8).map((line) => (
                <View
                  key={line.id}
                  style={[
                    styles.transferDot,
                    { backgroundColor: line.color ?? FALLBACK_ACCENT },
                  ]}
                />
              ))}
            </View>
          ) : null}
        </View>
        {stationNumber ? (
          <Typography style={[styles.stopNumber, { color: numberColor }]}>
            {stationNumber}
          </Typography>
        ) : null}
      </View>
    </View>
  );
};

// ヘッダーの駅名。長い駅名はフォントサイズを縮小せず、横方向に圧縮(長体)して
// 1行に収める。自然幅を非表示テキストで測り、スロット幅に収まる scaleX を当てる。
const StationName = ({
  text,
  color,
  withNumbering,
}: {
  text: string;
  color: string;
  withNumbering: boolean;
}) => {
  const [availableWidth, setAvailableWidth] = useState(0);
  // 計測値は対象テキストとセットで保持し、駅名が変わった直後に前の駅名の
  // 幅で圧縮してしまわないようにする。
  const [measured, setMeasured] = useState({ text: '', width: 0 });
  const measuredWidth = measured.text === text ? measured.width : 0;
  // 末尾欠けを防ぐためのバッファを足した描画幅。スロット幅を超えるぶんだけ
  // 左基準で横圧縮(長体)して 1 行に収める。
  const renderWidth =
    measuredWidth > 0 ? measuredWidth + STATION_NAME_MEASURE_BUFFER : 0;
  const scaleX =
    availableWidth > 0 && renderWidth > availableWidth
      ? availableWidth / renderWidth
      : 1;

  const handleTextLayout = (
    e: NativeSyntheticEvent<TextLayoutEventData>
  ): void => {
    const width = e.nativeEvent.lines.reduce(
      (max, line) => Math.max(max, line.width),
      0
    );
    setMeasured((prev) =>
      prev.text === text && prev.width === width ? prev : { text, width }
    );
  };

  // onTextLayout が発火しない環境向けのフォールバック。計測専用コンテナは
  // 十分広いので、その幅未満ならテキスト本来の幅とみなす。
  const handleMeasureLayout = (e: LayoutChangeEvent): void => {
    const width = e.nativeEvent.layout.width;
    if (width <= 0 || width >= STATION_NAME_MEASURE_WIDTH) {
      return;
    }
    setMeasured((prev) =>
      prev.text === text && prev.width >= width ? prev : { text, width }
    );
  };

  return (
    <View
      testID="portrait-station-name-slot"
      style={[
        styles.stationNameSlot,
        withNumbering && styles.stationNameSlotWithNumbering,
      ]}
      onLayout={(e) =>
        setAvailableWidth(e.nativeEvent.layout.width - (withNumbering ? 8 : 0))
      }
    >
      {/* 自然幅の測定用(非表示)。幅無制限のコンテナでラップして、親スロットの
          幅制約による省略を避け、テキスト本来の幅を測る。 */}
      <View style={styles.stationNameMeasure} pointerEvents="none">
        <Typography
          numberOfLines={1}
          testID="portrait-station-name-measure"
          style={[styles.stationNameText, { color }]}
          onLayout={handleMeasureLayout}
          onTextLayout={handleTextLayout}
        >
          {text}
        </Typography>
      </View>
      {/* 表示用。描画幅(width)を与えて省略させず、左基準で横圧縮して
          スロット内に収める(はみ出しはスロットの overflow:hidden でクリップ)。
          計測完了前(renderWidth===0)は opacity:0 にして、スケーリング未適用の
          テキストが overflow:hidden でクリップされるのを防ぐ。 */}
      <Typography
        numberOfLines={1}
        ellipsizeMode="clip"
        testID="portrait-station-name"
        style={[
          styles.stationNameText,
          { color },
          renderWidth > 0
            ? {
                width: renderWidth,
                transform: [{ scaleX }],
                // 左端を基準に横圧縮する。2 値のキーワード文字列('left center')は
                // New Architecture でパースされず中央基準にフォールバックし、圧縮した
                // 駅名(主に文字数の多いひらがな表記)が右へ寄ってしまう。数値配列形式
                // [x, y, z] で指定するとパースを介さず確実に左端基準になる。
                transformOrigin: [0, '50%', 0],
              }
            : { opacity: 0 },
        ]}
      >
        {text}
      </Typography>
    </View>
  );
};

// 現在地まわりに敷く路線色のにじみ。ダークでは発光、ライトでは淡い染みに見える。
const AccentWash = ({ color, opacity }: { color: string; opacity: number }) => {
  // url(#id) で参照するため、useId が返すコロンなどを落として SVG の識別子として
  // 妥当な文字列にする。
  const gradientId = `portraitWash${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  return (
    <Svg
      pointerEvents="none"
      style={styles.wash}
      width={WASH_WIDTH}
      height={WASH_HEIGHT}
    >
      <Defs>
        <RadialGradient id={gradientId} cx="50%" cy="50%" rx="50%" ry="50%">
          <GradientStop offset="0" stopColor={color} stopOpacity={opacity} />
          <GradientStop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect
        x="0"
        y="0"
        width={WASH_WIDTH}
        height={WASH_HEIGHT}
        fill={`url(#${gradientId})`}
      />
    </Svg>
  );
};

const PortraitMain: React.FC = () => {
  // ステータスバー非表示で全画面描画するため SafeAreaView は使わないが、
  // Dynamic Island / ノッチやホームインジケータと表示が被らないよう、
  // 上下のセーフエリア分を padding として確保する。
  const insets = useSafeAreaInsets();
  const colors = useAtomValue(appColorsAtom);
  const commonData = useHeaderCommonData();
  const allStations = useAtomValue(stationsAtom);
  const selectedDirection = useAtomValue(selectedDirectionAtom);
  const currentStation = useCurrentStation();
  const arrived = useAtomValue(arrivedAtom);
  const currentLine = useCurrentLine();
  const trainType = useCurrentTrainType();
  // 行先は言語切り替えタイマーで多言語化せず日本語固定で表示する
  const boundText = useBoundText().JA;

  const lineColor = currentLine?.color ?? FALLBACK_ACCENT;
  const accentColor = useMemo(
    () => accentColorFor(lineColor, colors.isDark),
    [lineColor, colors.isDark]
  );
  const trainTypeColor = normalizeTrainTypeColor(trainType?.color ?? undefined);
  const trainTypeTextColor = getTrainTypeTextColor(
    trainType?.color ?? undefined
  );

  const lineName = useMemo(
    () =>
      (isJapanese ? currentLine?.nameShort : currentLine?.nameRoman)?.replace(
        parenthesisRegexp,
        ''
      ) ?? '',
    [currentLine?.nameShort, currentLine?.nameRoman]
  );

  const trainTypeName = useMemo(
    () =>
      (isJapanese ? trainType?.name : trainType?.nameRoman)?.replace(
        parenthesisRegexp,
        ''
      ) ?? '',
    [trainType?.name, trainType?.nameRoman]
  );

  // ポートレートでは路線の全駅を進行方向順(上から下)に表示する。
  // 2路線の接続駅の重複を dropEitherJunctionStation で除いたうえで、
  // INBOUND は index 増加方向へ進むので昇順のまま、OUTBOUND は index 減少
  // 方向へ進むので反転する(useRefreshLeftStations と同じ向き)。
  const stops = useMemo(() => {
    const list = allStations.filter((s): s is Station => !!s);
    const dropped = dropEitherJunctionStation(list, selectedDirection);
    return selectedDirection === 'OUTBOUND' ? [...dropped].reverse() : dropped;
  }, [allStations, selectedDirection]);

  // 現在の最寄り駅(列車位置)の index。
  const currentIndex = useMemo(
    () => stops.findIndex((s) => s.groupId === currentStation?.groupId),
    [stops, currentStation]
  );

  // 終点に到達したあと到着判定が外れると、arrived が false のまま現在駅は最終駅に
  // 留まる(!arrived の間 useRefreshStation は現在駅を進めない)。素直に次駅へ進めると
  // markerRowIndex が範囲外になり、列車ピンが消えて全行が発車済みの淡色になってしまう。
  // 最終駅より先へは進めないので、その駅に停車しているものとして描く。
  const atLastStation = currentIndex >= 0 && currentIndex === stops.length - 1;
  const stoppedHere = arrived || atLastStation;

  // 強調する停車駅。停車中は現在駅(停車駅)、発車後・通過中は次の停車駅。
  const currentStopIndex = useMemo(
    () =>
      stops.findIndex((s, i) => {
        if (i < currentIndex) {
          return false;
        }
        if (i === currentIndex && !stoppedHere) {
          return false;
        }
        return !getIsPass(s);
      }),
    [stops, currentIndex, stoppedHere]
  );

  // カード脇の注記に使う「次の停車駅」の位置。
  const nextStopIndex = useMemo(() => {
    if (!stoppedHere) {
      return currentStopIndex;
    }
    return stops.findIndex((s, i) => i > currentIndex && !getIsPass(s));
  }, [stops, currentIndex, currentStopIndex, stoppedHere]);

  // カード脇の注記。停車中は「つぎ ◯◯」で次にどこへ向かうかを示す。走行中は
  // カードが既に次の停車駅を出しているので同じことは書かず、そこへ着くまでに
  // 通過する駅を示す。通過駅がない路線では何も出さない。
  const cardMetaText = useMemo(() => {
    const label = (station: Station): string =>
      isJapanese
        ? (station.name ?? '')
        : (station.nameRoman ?? station.name ?? '');

    if (nextStopIndex < 0) {
      return null;
    }
    if (stoppedHere) {
      const next = stops[nextStopIndex];
      return next
        ? translate('portraitNextStop', { station: label(next) })
        : null;
    }
    const passing = stops.slice(currentIndex + 1, nextStopIndex);
    if (!passing.length) {
      return null;
    }
    return passing.length === 1
      ? translate('portraitPassThrough', { station: label(passing[0]) })
      : translate('portraitPassThroughMore', {
          station: label(passing[0]),
          count: passing.length - 1,
        });
  }, [stops, currentIndex, nextStopIndex, stoppedHere]);

  // 列車位置のピン(進行方向=下向き)。停車中は現在駅のドット直上、
  // 発車後は現在駅と次駅の境目=発車済みの色が切り替わる位置(次駅行の上端)に出す。
  const markerRowIndex = stoppedHere ? currentIndex : currentIndex + 1;
  const markerPosition: MarkerPosition = stoppedHere
    ? 'above-dot'
    : 'segment-top';

  // 走行中または通過中(現在駅が通過駅)はピンを上下にバウンスさせて
  // 停車中との違いを示す。
  const markerMoving =
    !stoppedHere || getIsPass(stops[currentIndex] ?? undefined);

  // rowYs は各行の上端 y を記録する(onLayout は行のレイアウト時にしか発火しないので、
  // currentIndex 変更でコールバックが別行に移っても再取得できない。全行を記録して
  // index で引く)。
  const [rowYs, setRowYs] = useState<Record<number, number>>({});
  const markerRowY = rowYs[markerRowIndex] ?? 0;

  // 到着(ピン=現在駅)・出発(ピン=次駅)のたびに、ピンの行を表示領域の上
  // (1つ前の駅が見える程度に1行分の余白を残した位置)へスクロールする。
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    if (markerRowY > 0) {
      scrollRef.current?.scrollTo({
        y: Math.max(0, STOP_LIST_PADDING_V + markerRowY - STOP_ROW_HEIGHT),
        animated: true,
      });
    }
  }, [markerRowY]);

  if (!commonData) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]} />
    );
  }

  const {
    stateText,
    stationText,
    currentStationNumber,
    numberingColor,
    headerState,
  } = commonData;

  // 停車中の英中韓 state を補完する
  const displayStateText = resolveStateText(stateText, headerState);
  const progress = progressForState(headerState);

  return (
    // ステータスバーは非表示のため SafeAreaView は使わず素の View を使う。
    // 上端は Dynamic Island / ノッチと路線情報が被らないよう、
    // セーフエリア上端ぶんの padding を確保する。
    <View
      testID="portrait-root"
      style={[
        styles.root,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      <AccentWash
        color={accentColor}
        opacity={colors.isDark ? WASH_OPACITY_DARK : WASH_OPACITY_LIGHT}
      />

      {/* 路線・種別・行き先 */}
      <View style={styles.metaRow}>
        <View style={[styles.lineColorBar, { backgroundColor: accentColor }]} />
        <Typography
          numberOfLines={1}
          style={[styles.lineName, { color: colors.text }]}
        >
          {lineName}
        </Typography>
        {trainTypeName ? (
          <View
            style={[styles.trainTypeBadge, { backgroundColor: trainTypeColor }]}
          >
            <Typography
              style={[styles.trainTypeText, { color: trainTypeTextColor }]}
            >
              {trainTypeName}
            </Typography>
          </View>
        ) : null}
        <View style={styles.metaSpacer} />
        <Typography
          numberOfLines={1}
          style={[styles.boundText, { color: colors.secondaryText }]}
        >
          {boundText}
        </Typography>
      </View>

      {/* 現在駅カード */}
      <View
        testID="portrait-station-card"
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.cardHeadRow}>
          <Typography
            numberOfLines={1}
            style={[styles.stateText, { color: accentColor }]}
          >
            {displayStateText}
          </Typography>
          <View
            style={[styles.cardHeadRule, { backgroundColor: colors.border }]}
          />
          {cardMetaText ? (
            <Typography
              numberOfLines={1}
              testID="portrait-card-meta"
              style={[styles.cardHeadMeta, { color: passTextColor(colors) }]}
            >
              {cardMetaText}
            </Typography>
          ) : null}
        </View>

        <View style={styles.stationNameRow}>
          {currentStationNumber ? (
            <View style={styles.numberingColumn} testID="numbering-column">
              <NumberingIcon
                shape={currentStationNumber.lineSymbolShape || ''}
                lineColor={accentColorFor(numberingColor, colors.isDark)}
                stationNumber={currentStationNumber.stationNumber || ''}
                threeLetterCode={commonData.threeLetterCode}
              />
            </View>
          ) : null}
          <StationName
            text={stationText}
            color={colors.text}
            withNumbering={!!currentStationNumber}
          />
        </View>

        {/* 駅間の進み具合。到着すると満ちる */}
        <View
          testID="portrait-progress-track"
          style={[styles.progressTrack, { backgroundColor: colors.border }]}
        >
          <View
            testID="portrait-progress-fill"
            style={[
              styles.progressFill,
              {
                width: `${progress * 100}%`,
                backgroundColor: accentColor,
              },
            ]}
          />
        </View>
      </View>

      {/* 停車駅リスト */}
      <View style={styles.stopList}>
        <ScrollView
          ref={scrollRef}
          testID="portrait-stop-list"
          contentContainerStyle={[
            styles.stopListContent,
            // スクロール末尾でも最終駅がホームインジケータに被って
            // 見切れないよう、下端のセーフエリア分を余白として足す。
            { paddingBottom: STOP_LIST_PADDING_V + insets.bottom },
          ]}
        >
          {stops.map((station, index) => {
            // 列車位置のピンより前の行(過ぎた線路)を淡色にする。停車中・
            // 走行中とも、ピンの行とそれ以降は通常色のまま。
            const departed = index < markerRowIndex;
            return (
              <StopRow
                key={station.id}
                station={station}
                colors={colors}
                isFirst={index === 0}
                isLast={index === stops.length - 1}
                isFocused={index === currentStopIndex}
                departed={departed}
                marker={index === markerRowIndex ? markerPosition : null}
                markerMoving={markerMoving}
                fallbackLineColor={lineColor}
                elevated={index === markerRowIndex}
                onLayoutTop={(y) =>
                  setRowYs((prev) =>
                    prev[index] === y ? prev : { ...prev, [index]: y }
                  )
                }
              />
            );
          })}
        </ScrollView>
        {/* 最終行がホームインジケータへ溶けるよう下端をぼかす */}
        <LinearGradient
          pointerEvents="none"
          colors={[rgba(colors.background, 0), colors.background]}
          style={styles.listFade}
        />
      </View>
    </View>
  );
};

export default memo(PortraitMain);

import { LinearGradient } from 'expo-linear-gradient';
import { useAtomValue } from 'jotai';
import { darken, getLuminance, mix, rgba } from 'polished';
import type React from 'react';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Circle, Path, Svg } from 'react-native-svg';
import type { Station } from '~/@types/graphql';
import { parenthesisRegexp } from '~/constants';
import {
  useBoundText,
  useCurrentLine,
  useCurrentStation,
  useCurrentTrainType,
  useHeaderCommonData,
  useStationNumberIndexFunc,
  useTransferLinesFromStation,
} from '~/hooks';
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

// テーマ非依存の独自カラーパレット。選択中のテーマに関わらず、設定画面などの
// 操作系画面と印象を揃えたライト基調(白ベース)で統一する。
const COLORS = {
  background: '#FFFFFF',
  textPrimary: '#212121',
  textSecondary: '#8B8B8B',
  // 通過駅の駅名・記号用。停車駅(textSecondary)よりさらに薄くして
  // 「停まらない駅」であることを色の淡さで示す。
  textPass: '#C2C2C2',
  divider: '#E0E0E0',
  fallbackAccent: '#888888',
} as const;

// 白背景の上に文字色として置いても読めるよう、明るい路線色は暗めに倒す。
const readableAccentColor = (color: string): string => {
  try {
    return getLuminance(color) > 0.5 ? darken(0.25, color) : color;
  } catch {
    return COLORS.fallbackAccent;
  }
};

// 発車済み駅のトラック(縦棒・ドット)用に白へ寄せた淡い色。
// opacity で半透明フェードすると縦棒とリングの重なり部分だけ二重合成で
// 濃くなって不自然なので、不透明のままフェードした色を使い、同色の
// 重なりが目立たないようにする。
const departedTrackColor = (color: string): string => {
  try {
    return mix(0.4, color, COLORS.background);
  } catch {
    return COLORS.divider;
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

// 駅名セクションの背景に敷く路線色の淡いティント。
const lineTintColor = (color: string): string => {
  try {
    // 明るい路線色はそのまま透過するとほぼ白に潰れて
    // 視認できないため、文字色と同じ補正を通してから透過する
    return rgba(readableAccentColor(color), 0.08);
  } catch {
    return COLORS.background;
  }
};

// 画面端からコンテンツまでの左右余白。区切り線は全幅のまま、
// 路線カラーバー・駅名・停車駅リストをこの分だけ内側に寄せる。
const CONTENT_INSET = 24;

// NumberingIcon の LARGE サイズ実寸(NumberingIconRound 基準)に合わせた固定幅。
// ナンバリングがある駅では駅名の長さで記号の表示位置が動かないよう
// 駅名行の左端に固定幅の枠を確保する。ナンバリングがない駅では枠ごと
// 描画せず、その分を駅名表示に充てる。行の minHeight にも流用し、
// ナンバリングの有無で駅名セクションの高さが変わらないようにする。
const NUMBERING_COLUMN_WIDTH = isTablet ? 72 * 1.5 : 72;

// トラック列と縦棒の幅。一筋の光(trackLight)を縦棒の x 位置・幅に合わせる
// ためにも使う。
const TRACK_COLUMN_WIDTH = 36;
const TRACK_LINE_WIDTH = 22;

// 縦棒を流れる光の帯の高さ(px)。
const TRACK_LIGHT_HEIGHT = 28;

// 停車駅リストの上下パディング。光の開始位置(行の y)を stopList 座標へ
// 変換するのにも使う。
const STOP_LIST_PADDING_V = 12;

// 停車駅リストの1行の高さ(stopRow の minHeight)。スクロール時に現在駅の
// 1つ前の駅が見える程度の余白を残すために使う。
const STOP_ROW_HEIGHT = 72;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  lineSection: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: CONTENT_INSET,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  // 停車駅リストの縦棒(trackLine)と同じ太さに揃える
  lineColorBar: {
    width: TRACK_LINE_WIDTH,
  },
  lineSectionBody: {
    flex: 1,
    paddingLeft: 16,
    paddingVertical: 12,
  },
  lineNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lineName: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: RFValue(16),
    fontWeight: 'bold',
  },
  trainTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  trainTypeText: {
    fontSize: RFValue(12),
    fontWeight: 'bold',
  },
  // 行き先・状態テキスト・駅名はヘッダーの言語切り替えタイマーで内容が変わる。
  // 和文と欧文でフォントメトリクスが異なり行の高さが変動するため、
  // 高さと lineHeight を固定してセクション全体がガタつかないようにする。
  boundText: {
    marginTop: 4,
    color: COLORS.textSecondary,
    fontSize: RFValue(13),
    fontWeight: 'bold',
    height: RFValue(20),
    lineHeight: RFValue(20),
  },
  stationSection: {
    alignItems: 'stretch',
    paddingVertical: 20,
    paddingHorizontal: CONTENT_INSET,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  stateText: {
    color: COLORS.textSecondary,
    fontSize: RFValue(18),
    fontWeight: 'bold',
    height: RFValue(28),
    lineHeight: RFValue(28),
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
    color: COLORS.textPrimary,
    fontSize: RFValue(32),
    fontWeight: 'bold',
  },
  // 自然幅の測定専用(非表示)。絶対配置 + 十分広い固定幅 + 左寄せで、親スロットの
  // 幅制約を受けずテキストを省略させずに本来の幅を測る。描画には出さない。
  stationNameMeasure: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 1000,
    alignItems: 'flex-start',
    opacity: 0,
  },
  stopList: {
    flex: 1,
    overflow: 'hidden',
  },
  stopListContent: {
    paddingVertical: STOP_LIST_PADDING_V,
    paddingHorizontal: CONTENT_INSET,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    // 駅名の下に番号・乗換ドットを絶対配置するぶん、行間を広めに確保する。
    minHeight: STOP_ROW_HEIGHT,
  },
  trackColumn: {
    width: TRACK_COLUMN_WIDTH,
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
  trackLine: {
    position: 'absolute',
    top: -1,
    bottom: -1,
    width: TRACK_LINE_WIDTH,
  },
  // 停車駅リストの縦棒の上を1本だけ流す光。ScrollView コンテンツ内に置き、
  // 縦棒の x 位置・幅に合わせて重ねる。zIndex は縦棒・ドット(=0)より上、
  // 列車マーカーの行(=2)より下に置き、光がピンの裏を通るようにする。
  trackLight: {
    position: 'absolute',
    top: 0,
    left: (TRACK_COLUMN_WIDTH - TRACK_LINE_WIDTH) / 2,
    width: TRACK_LINE_WIDTH,
    height: TRACK_LIGHT_HEIGHT,
    zIndex: 1,
  },
  // 列車マーカーの行。光(zIndex 1)より上に出してピンの裏を光が通るようにする。
  stopRowElevated: {
    zIndex: 2,
  },
  // 列車位置マーカー(丸い頭+下向きの尖り)のコンテナ。絶対配置でセグメントの
  // フロー高さに影響させず、ドット位置を chevron 種別に依らず一定に保つ。
  trainMarker: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  // 発車後: 上の行との境目(=半透明と通常色の境界)にピンの円中心を合わせる。
  // ピンは高さ37・円中心 cy14 なので、円中心がセグメント上端(=境界)に来るよう
  // top を -14 にする。これで半透明はピンの中央を超えない。
  trainMarkerSegmentTop: {
    top: -14,
  },
  // 停車中: マーカーの尖り(下端)を現在駅のドットのすぐ上に寄せる。
  trainMarkerAboveDot: {
    bottom: 2,
  },
  // 白抜きの穴(内径 28-6*2=16px)を縦棒(幅22px)より狭くして、縦棒が穴を
  // またいでリング(ボーダー)の内側へ潜り込むようにする。これで縦棒と
  // リングの間に白い隙間が生じず、縦棒が駅の丸にシームレスに連結する。
  // 外径(28px)は縦棒(22px)より太く、駅の丸が縦棒から膨らんで見える。
  // 負マージンで上下セグメントを円の背後まで重ね、継ぎ目を出さない。
  stopDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 6,
    backgroundColor: COLORS.background,
    marginVertical: -5,
    zIndex: 1,
  },
  // 通過駅は縦棒より細い「抜き穴」で表現する。棒をまたぐリングだと
  // 円からはみ出した棒の直線エッジが見えてしまうため、穴を棒の内側に収める。
  // 高さぶんの負マージンでフロー占有を0にし、上下のセグメントを背後で連結する。
  passDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.background,
    marginVertical: -5,
    zIndex: 1,
  },
  stopBody: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  stopBodyDeparted: {
    opacity: 0.4,
  },
  // 駅名のラップ。高さは駅名のみ(サブ情報は absolute で含めない)なので、
  // stopBody の justifyContent:center で駅名が行の縦中央=丸の真横に来る。
  stopLabel: {
    alignSelf: 'flex-start',
  },
  // 番号・乗換ドットを駅名の真下に絶対配置。行の高さに影響させない。
  stopSubInfo: {
    position: 'absolute',
    top: '100%',
    left: 0,
  },
  stopName: {
    color: COLORS.textPrimary,
    fontSize: RFValue(16),
    fontWeight: 'bold',
  },
  stopNameCurrent: {
    fontSize: RFValue(18),
  },
  stopNamePass: {
    color: COLORS.textPass,
    fontWeight: 'normal',
  },
  stopNumbering: {
    marginTop: -2,
    color: COLORS.textSecondary,
    fontSize: RFValue(11),
    lineHeight: RFValue(13),
    fontWeight: 'bold',
  },
  stopNumberingPass: {
    color: COLORS.textPass,
    fontWeight: 'normal',
  },
  transferDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    height: 10,
  },
  transferDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
});

type ChevronPosition = 'above-dot' | 'segment-top' | null;

// 列車位置マーカー(下向きのティアドロップ型ピン)。丸い頭(円)と下の尖りを
// 1つのシルエットとして描く。塗りはラインカラー、白い縁取りを付けることで
// 同色の縦棒(trackLine)に尖りが埋もれず、線路上に乗ったピンとして読める。
// 円(head)と尖り(tail)はそれぞれ「白い大きめ図形→塗りの図形」の2層構成にし、
// 同色図形の重なりで継ぎ目なく融合させつつ、外周だけ白を覗かせて縁取りにする。
// 座標は viewBox 28x37・中心(14,14)・頭半径11、尖り先端を下に伸ばした接線三角形。
const TrainMarkerPin = ({ color }: { color: string }) => (
  <Svg width={28} height={37} viewBox="0 0 28 37">
    {/* 白い縁取り層(頭半径13・尖りを一回り大きく) */}
    <Circle cx={14} cy={14} r={13} fill={COLORS.background} />
    <Path d="M3.51 21.68 L14 36 L24.49 21.68 Z" fill={COLORS.background} />
    {/* ラインカラーの本体層(頭半径11) */}
    <Circle cx={14} cy={14} r={11} fill={color} />
    <Path d="M4.81 20.05 L14 34 L23.19 20.05 Z" fill={color} />
  </Svg>
);

// 列車位置ピンを軽く拍動(パルス)させ、「いまここを走っている」生きた感じを出す。
// moving(走行中・通過中)のときは上下にバウンスさせ、停車中との違いを動きで示す。
const PULSE_DURATION = 850;
const BOUNCE_DURATION = 500;
const TrainMarker = ({ color, moving }: { color: string; moving: boolean }) => {
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
      <TrainMarkerPin color={color} />
    </Animated.View>
  );
};

// 縦棒の上を下方向へ流れる一筋の光。半透明の白いグラデーション帯を、
// 列車位置(透明度が切り替わる境界 startY)からリスト下端まで translateY で
// スライドさせる。帯は縦棒の x 位置・幅に合わせて重ね、色のある縦棒上でだけ
// 光って見える(白いドット上では同化して消える)。発車済み(半透明)区間より
// 手前=列車の進行方向側だけを流れる。
// 所要時間は駅数(距離)に依らず固定。リストが長いほど速く流れる。
const LIGHT_DURATION = 3000; // ms(始点→下端の1往復にかかる時間)
const TrackLight = ({ startY, height }: { startY: number; height: number }) => {
  const translateY = useSharedValue(startY);

  useEffect(() => {
    translateY.value = startY;
    translateY.value = withRepeat(
      withTiming(height, { duration: LIGHT_DURATION }),
      -1,
      false
    );
    return () => cancelAnimation(translateY);
  }, [startY, height, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.trackLight, animatedStyle]}
    >
      <LinearGradient
        colors={['transparent', 'rgba(255,255,255,0.55)', 'transparent']}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
};

const TrackSegment = ({
  color,
  hidden,
  chevron = null,
  lineTestID,
  // ピン(列車)の色。縦棒(color)が通過中などで淡色化されても、列車そのものを
  // 表すピンは通常の路線色のままにしたいので別に受け取る。
  markerColor,
  markerMoving = false,
}: {
  color: string;
  hidden: boolean;
  chevron?: ChevronPosition;
  lineTestID?: string;
  markerColor?: string;
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
        chevron の位置(segment-top/above-dot)が変わってもドット位置は不変。 */}
    {chevron ? (
      <View
        style={[
          styles.trainMarker,
          chevron === 'segment-top' && styles.trainMarkerSegmentTop,
          chevron === 'above-dot' && styles.trainMarkerAboveDot,
        ]}
        testID="train-chevron"
      >
        <TrainMarker color={markerColor ?? color} moving={markerMoving} />
      </View>
    ) : null}
  </View>
);

const StopRow = ({
  station,
  isFirst,
  isLast,
  isCurrent,
  departed,
  chevron,
  markerMoving,
  fallbackLineColor,
  elevated,
  onLayoutTop,
}: {
  station: Station;
  isFirst: boolean;
  isLast: boolean;
  isCurrent: boolean;
  departed: boolean;
  chevron: ChevronPosition;
  markerMoving: boolean;
  fallbackLineColor: string;
  elevated?: boolean;
  onLayoutTop?: (y: number) => void;
}) => {
  const isPass = getIsPass(station);
  // 直通運転で路線が変わったら縦棒も直通先のラインカラーで塗る
  const lineColor = station.line?.color ?? fallbackLineColor;
  const accentColor = useMemo(
    () => readableAccentColor(lineColor),
    [lineColor]
  );
  // 列車が過ぎた線路(departed)だけを不透明の淡い色でフェードする(半透明だと
  // 縦棒とリングの重なりが濃くなるため不透明のままフェード)。テキストは
  // stopBody の opacity でフェードする。
  const trackColor = useMemo(
    () => (departed ? departedTrackColor(lineColor) : lineColor),
    [departed, lineColor]
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

  return (
    <View
      style={[styles.stopRow, elevated && styles.stopRowElevated]}
      testID={`stop-row-${station.id}`}
      onLayout={
        onLayoutTop ? (e) => onLayoutTop(e.nativeEvent.layout.y) : undefined
      }
    >
      <View style={styles.trackColumn}>
        {/* 全駅表示なので上側は始発駅(isFirst)、下側は終点(isLast)でのみ
            隠す。中間駅は前後の駅と線が繋がる。 */}
        <TrackSegment
          color={trackColor}
          markerColor={lineColor}
          markerMoving={markerMoving}
          hidden={isFirst}
          chevron={chevron}
          lineTestID={`track-top-${station.id}`}
        />
        {isPass ? (
          <View style={styles.passDot} />
        ) : (
          <View
            style={[styles.stopDot, { borderColor: trackColor }]}
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
        style={[styles.stopBody, departed && styles.stopBodyDeparted]}
        testID={`stop-body-${station.id}`}
      >
        {/* 駅名を行の縦中央に置き、丸(縦棒の中央)と真横に揃える。
            番号・乗換ドットは駅名の下に絶対配置して行の高さに影響させない。 */}
        <View style={styles.stopLabel}>
          <Typography
            numberOfLines={1}
            style={[
              styles.stopName,
              isCurrent && [styles.stopNameCurrent, { color: accentColor }],
              isPass && styles.stopNamePass,
            ]}
          >
            {stationName}
          </Typography>
          <View style={styles.stopSubInfo}>
            {stationNumber ? (
              <Typography
                style={[
                  styles.stopNumbering,
                  isPass && styles.stopNumberingPass,
                ]}
              >
                {stationNumber}
              </Typography>
            ) : null}
            {/* 乗り換えドットの行は常に同じ高さを確保する(ドットは有るときだけ描画)。 */}
            <View style={styles.transferDotsRow}>
              {!isPass &&
                transferLines.slice(0, 8).map((line) => (
                  <View
                    key={line.id}
                    style={[
                      styles.transferDot,
                      {
                        backgroundColor: line.color ?? COLORS.fallbackAccent,
                      },
                    ]}
                  />
                ))}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

// ヘッダーの駅名。長い駅名はフォントサイズを縮小せず、横方向に圧縮(長体)して
// 1行に収める。自然幅を非表示テキストで測り、スロット幅に収まる scaleX を当てる。
const StationName = ({
  text,
  withNumbering,
}: {
  text: string;
  withNumbering: boolean;
}) => {
  const [availableWidth, setAvailableWidth] = useState(0);
  const [naturalWidth, setNaturalWidth] = useState(0);
  const scaleX =
    availableWidth > 0 && naturalWidth > availableWidth
      ? availableWidth / naturalWidth
      : 1;

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
          style={styles.stationNameText}
          onLayout={(e) => setNaturalWidth(e.nativeEvent.layout.width)}
        >
          {text}
        </Typography>
      </View>
      {/* 表示用。自然幅(width)を与えて省略させず、左基準で横圧縮して
          スロット内に収める(はみ出しはスロットの overflow:hidden でクリップ)。 */}
      <Typography
        numberOfLines={1}
        testID="portrait-station-name"
        style={[
          styles.stationNameText,
          naturalWidth > 0 && {
            width: naturalWidth,
            transform: [{ scaleX }],
            transformOrigin: 'left center',
          },
        ]}
      >
        {text}
      </Typography>
    </View>
  );
};

const PortraitMain: React.FC = () => {
  const commonData = useHeaderCommonData();
  const allStations = useAtomValue(stationsAtom);
  const selectedDirection = useAtomValue(selectedDirectionAtom);
  const currentStation = useCurrentStation();
  const arrived = useAtomValue(arrivedAtom);
  const currentLine = useCurrentLine();
  const trainType = useCurrentTrainType();
  // 行先は言語切り替えタイマーで多言語化せず日本語固定で表示する
  const boundText = useBoundText().JA;

  const lineColor = currentLine?.color ?? COLORS.fallbackAccent;
  const accentColor = useMemo(
    () => readableAccentColor(lineColor),
    [lineColor]
  );
  const stationSectionTint = useMemo(
    () => lineTintColor(lineColor),
    [lineColor]
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

  // 強調する停車駅。停車中は現在駅(停車駅)、発車後・通過中は次の停車駅。
  const currentStopIndex = useMemo(
    () =>
      stops.findIndex((s, i) => {
        if (i < currentIndex) {
          return false;
        }
        if (i === currentIndex && !arrived) {
          return false;
        }
        return !getIsPass(s);
      }),
    [stops, currentIndex, arrived]
  );

  // 列車位置の三角(進行方向=下向き)。停車中は現在駅のドット直上、
  // 発車後は現在駅と次駅の境目=透明度が切り替わる位置(次駅行の上端)に出す。
  const chevronRowIndex = arrived ? currentIndex : currentIndex + 1;
  const chevronPosition: ChevronPosition = arrived
    ? 'above-dot'
    : 'segment-top';

  // 走行中(!arrived)または通過中(現在駅が通過駅)はピンを上下にバウンスさせて
  // 停車中との違いを示す。
  const markerMoving = !arrived || getIsPass(stops[currentIndex] ?? undefined);

  // listHeight はコンテンツ(全駅)の高さで光のスライド用。rowYs は各行の上端 y を
  // 記録する(onLayout は行のレイアウト時にしか発火しないので、currentIndex 変更で
  // コールバックが別行に移っても再取得できない。全行を記録しておき index で引く)。
  const [listHeight, setListHeight] = useState(0);
  const [rowYs, setRowYs] = useState<Record<number, number>>({});
  const chevronRowY = rowYs[chevronRowIndex] ?? 0;

  // 到着(ピン=現在駅)・出発(ピン=次駅)のたびに、ピンの行を表示領域の上
  // (1つ前の駅が見える程度に1行分の余白を残した位置)へスクロールする。
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    if (chevronRowY > 0) {
      scrollRef.current?.scrollTo({
        y: Math.max(0, STOP_LIST_PADDING_V + chevronRowY - STOP_ROW_HEIGHT),
        animated: true,
      });
    }
  }, [chevronRowY]);

  if (!commonData) {
    return <View style={styles.root} />;
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

  return (
    // ポートレート時は上下のセーフエリアを無視して全画面に描画する。
    // ステータスバーは非表示のため SafeAreaView は使わず素の View を使う。
    <View style={styles.root}>
      {/* 路線・行き先情報 */}
      <View style={styles.lineSection}>
        <View style={[styles.lineColorBar, { backgroundColor: lineColor }]} />
        <View style={styles.lineSectionBody}>
          <View style={styles.lineNameRow}>
            <Typography numberOfLines={1} style={styles.lineName}>
              {lineName}
            </Typography>
            {trainTypeName ? (
              <View
                style={[
                  styles.trainTypeBadge,
                  { backgroundColor: trainTypeColor },
                ]}
              >
                <Typography
                  style={[styles.trainTypeText, { color: trainTypeTextColor }]}
                >
                  {trainTypeName}
                </Typography>
              </View>
            ) : null}
          </View>
          <Typography numberOfLines={1} style={styles.boundText}>
            {boundText}
          </Typography>
        </View>
      </View>

      {/* 駅名表示 */}
      <View
        style={[styles.stationSection, { backgroundColor: stationSectionTint }]}
      >
        <Typography
          numberOfLines={1}
          style={[styles.stateText, { color: accentColor }]}
        >
          {displayStateText}
        </Typography>
        <View style={styles.stationNameRow}>
          {currentStationNumber ? (
            <View style={styles.numberingColumn} testID="numbering-column">
              <NumberingIcon
                shape={currentStationNumber.lineSymbolShape || ''}
                lineColor={numberingColor}
                stationNumber={currentStationNumber.stationNumber || ''}
                threeLetterCode={commonData.threeLetterCode}
              />
            </View>
          ) : null}
          <StationName
            text={stationText}
            withNumbering={!!currentStationNumber}
          />
        </View>
      </View>

      {/* 停車駅リスト */}
      <View style={styles.stopList}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.stopListContent}
        >
          {/* 行と光を同じ座標系・スタッキング文脈に置くラッパー。光は縦棒の
              上(zIndex 1)、列車マーカーの行はさらに上(zIndex 2)に重なる。 */}
          <View onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}>
            {stops.map((station, index) => {
              // 列車位置のピンより前の行(過ぎた線路)を半透明にする。停車中・
              // 走行中とも、ピンの行とそれ以降は通常色のまま(ピンの位置から
              // 先は薄くしない)。
              const departed = index < chevronRowIndex;
              return (
                <StopRow
                  key={station.id}
                  station={station}
                  isFirst={index === 0}
                  isLast={index === stops.length - 1}
                  isCurrent={index === currentStopIndex}
                  departed={departed}
                  chevron={index === chevronRowIndex ? chevronPosition : null}
                  markerMoving={markerMoving}
                  fallbackLineColor={lineColor}
                  elevated={index === chevronRowIndex}
                  onLayoutTop={(y) =>
                    setRowYs((prev) =>
                      prev[index] === y ? prev : { ...prev, [index]: y }
                    )
                  }
                />
              );
            })}
            {/* 列車位置(透明度の境界)から下端まで流れる一筋の光 */}
            {listHeight > 0 ? (
              <TrackLight startY={chevronRowY} height={listHeight} />
            ) : null}
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

export default memo(PortraitMain);

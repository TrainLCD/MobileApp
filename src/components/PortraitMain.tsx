import { useAtomValue } from 'jotai';
import { darken, getLuminance, rgba } from 'polished';
import type React from 'react';
import { memo, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Station } from '~/@types/graphql';
import { parenthesisRegexp } from '~/constants';
import {
  useCurrentLine,
  useCurrentTrainType,
  useHeaderCommonData,
  useStationNumberIndexFunc,
  useTransferLinesFromStation,
} from '~/hooks';
import { leftStationsAtom } from '~/store/atoms/navigation';
import { arrivedAtom } from '~/store/atoms/station';
import { isJapanese, translate } from '~/translation';
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
// 駅名の長さやナンバリングの有無で記号の表示位置が動かないよう、
// 駅名行の左端に固定幅の枠を確保する。
const NUMBERING_COLUMN_WIDTH = isTablet ? 72 * 1.5 : 72;

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
  lineColorBar: {
    width: 8,
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
  stationName: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: RFValue(32),
    fontWeight: 'bold',
    paddingLeft: 8,
  },
  stopList: {
    flex: 1,
  },
  stopListContent: {
    paddingVertical: 12,
    paddingHorizontal: CONTENT_INSET,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 56,
  },
  stopRowDeparted: {
    opacity: 0.4,
  },
  trackColumn: {
    width: 32,
    alignItems: 'center',
  },
  trackSegment: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  // 発車後: 上の行(発車済み駅)との境目=透明度が切り替わる位置に寄せる
  trackSegmentChevronTop: {
    justifyContent: 'flex-start',
  },
  // 停車中: 現在駅のドットのすぐ上に寄せる。セグメント終端(中心から6px)は
  // ドット上端(中心から11px)より円側に食い込んでいるため、その差分を逃がす
  trackSegmentChevronBottom: {
    justifyContent: 'flex-end',
    paddingBottom: 5,
  },
  // 行高は小数を含むためセグメント境界が物理ピクセルに揃わず、丸めの
  // 具合で白い継ぎ目が出ることがある。上下1pxずつ食み出させて隣接する
  // セグメント同士を重ね、継ぎ目が出ないようにする。
  trackLine: {
    position: 'absolute',
    top: -1,
    bottom: -1,
    width: 12,
  },
  chevronTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 11,
    borderRightWidth: 11,
    borderTopWidth: 13,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  // 負マージンで上下セグメントを円の背後まで重ねる。セグメント終端は
  // 中心から±6px: 棒の途切れ矩形の角(6,6)=8.5px も棒の先端(±6px、
  // その高さの円の輪郭半幅は9.2px)も半径11の円に余裕を持って収まり、
  // ピクセル丸めで白い隙間や棒のはみ出しが出ない。
  stopDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 4,
    backgroundColor: COLORS.background,
    marginVertical: -5,
    zIndex: 1,
  },
  // 通過駅は縦棒より細い「抜き穴」で表現する。棒をまたぐリングだと
  // 円からはみ出した棒の直線エッジが見えてしまうため、穴を棒の内側に収める。
  // 高さぶんの負マージンでフロー占有を0にし、上下のセグメントを背後で連結する。
  passDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.background,
    marginVertical: -4,
    zIndex: 1,
  },
  stopBody: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
    paddingVertical: 8,
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
    color: COLORS.textSecondary,
    fontWeight: 'normal',
  },
  stopNumbering: {
    marginTop: -2,
    color: COLORS.textSecondary,
    fontSize: RFValue(11),
    lineHeight: RFValue(13),
  },
  transferDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  transferDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  passLabel: {
    alignSelf: 'center',
    color: COLORS.textSecondary,
    fontSize: RFValue(12),
  },
});

type ChevronPosition = 'above-dot' | 'segment-top' | null;

const TrackSegment = ({
  color,
  hidden,
  chevron = null,
}: {
  color: string;
  hidden: boolean;
  chevron?: ChevronPosition;
}) => (
  <View
    style={[
      styles.trackSegment,
      chevron === 'segment-top' && styles.trackSegmentChevronTop,
      chevron === 'above-dot' && styles.trackSegmentChevronBottom,
    ]}
  >
    <View
      style={[
        styles.trackLine,
        { backgroundColor: color, opacity: hidden ? 0 : 1 },
      ]}
    />
    {chevron ? (
      <View
        style={[styles.chevronTriangle, { borderTopColor: color }]}
        testID="train-chevron"
      />
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
  fallbackLineColor,
}: {
  station: Station;
  isFirst: boolean;
  isLast: boolean;
  isCurrent: boolean;
  departed: boolean;
  chevron: ChevronPosition;
  fallbackLineColor: string;
}) => {
  const isPass = getIsPass(station);
  // 直通運転で路線が変わったら縦棒も直通先のラインカラーで塗る
  const lineColor = station.line?.color ?? fallbackLineColor;
  const accentColor = useMemo(
    () => readableAccentColor(lineColor),
    [lineColor]
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
      style={[styles.stopRow, departed && styles.stopRowDeparted]}
      testID={`stop-row-${station.id}`}
    >
      <View style={styles.trackColumn}>
        <TrackSegment color={lineColor} hidden={isFirst} chevron={chevron} />
        {isPass ? (
          <View style={[styles.passDot, { borderColor: lineColor }]} />
        ) : (
          <View
            style={[
              styles.stopDot,
              { borderColor: lineColor },
              isCurrent && { backgroundColor: lineColor },
            ]}
            testID={`stop-dot-${station.id}`}
          />
        )}
        <TrackSegment color={lineColor} hidden={isLast} />
      </View>
      <View style={styles.stopBody}>
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
        {stationNumber ? (
          <Typography style={styles.stopNumbering}>{stationNumber}</Typography>
        ) : null}
        {!isPass && transferLines.length > 0 ? (
          <View style={styles.transferDotsRow}>
            {transferLines.slice(0, 8).map((line) => (
              <View
                key={line.id}
                style={[
                  styles.transferDot,
                  { backgroundColor: line.color ?? COLORS.fallbackAccent },
                ]}
              />
            ))}
          </View>
        ) : null}
      </View>
      {isPass ? (
        <Typography style={styles.passLabel}>
          {translate('passStationLabel')}
        </Typography>
      ) : null}
    </View>
  );
};

const PortraitMain: React.FC = () => {
  const commonData = useHeaderCommonData();
  const leftStations = useAtomValue(leftStationsAtom);
  const arrived = useAtomValue(arrivedAtom);
  const currentLine = useCurrentLine();
  const trainType = useCurrentTrainType();

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

  const stops = useMemo(
    () => leftStations.filter((s): s is Station => !!s),
    [leftStations]
  );

  // 強調する駅。停車中は先頭駅、発車後はヘッダーの「次は」と同じ次の停車駅。
  const currentStopIndex = useMemo(
    () => stops.findIndex((s, i) => (i > 0 || arrived) && !getIsPass(s)),
    [arrived, stops]
  );

  // 列車位置の三角(進行方向=下向き)。停車中は現在駅のドット直上、
  // 発車後は発車済み駅(半透明)と次駅の境目=透明度が切り替わる位置に出す。
  // 発車後に先頭行へ置くと行ごと半透明になってしまうので次の行の上端に置く。
  const chevronRowIndex = arrived ? 0 : 1;
  const chevronPosition: ChevronPosition = arrived
    ? 'above-dot'
    : 'segment-top';

  if (!commonData) {
    return <View style={styles.root} />;
  }

  const {
    stateText,
    stationText,
    boundText,
    currentStationNumber,
    numberingColor,
  } = commonData;

  return (
    <SafeAreaView style={styles.root}>
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
          {stateText}
        </Typography>
        <View style={styles.stationNameRow}>
          <View style={styles.numberingColumn}>
            {currentStationNumber ? (
              <NumberingIcon
                shape={currentStationNumber.lineSymbolShape || ''}
                lineColor={numberingColor}
                stationNumber={currentStationNumber.stationNumber || ''}
                threeLetterCode={commonData.threeLetterCode}
              />
            ) : null}
          </View>
          <Typography
            numberOfLines={1}
            adjustsFontSizeToFit
            style={styles.stationName}
          >
            {stationText}
          </Typography>
        </View>
      </View>

      {/* 停車駅リスト */}
      <View style={styles.stopList}>
        <ScrollView contentContainerStyle={styles.stopListContent}>
          {stops.map((station, index) => (
            <StopRow
              key={station.id}
              station={station}
              isFirst={index === 0}
              isLast={index === stops.length - 1}
              isCurrent={index === currentStopIndex}
              departed={index === 0 && !arrived}
              chevron={index === chevronRowIndex ? chevronPosition : null}
              fallbackLineColor={lineColor}
            />
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default memo(PortraitMain);

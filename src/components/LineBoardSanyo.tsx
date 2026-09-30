import { useAtomValue } from 'jotai';
import React, { useCallback, useId, useMemo, useState } from 'react';
import {
  type LayoutChangeEvent,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import Svg, {
  Defs,
  FeGaussianBlur,
  Filter,
  G,
  Polygon,
} from 'react-native-svg';
import type { Station, StationNumber } from '~/@types/graphql';
import {
  useDisplayCurrentStation,
  useStationNumberIndexFunc,
  useTransferLinesFromStation,
} from '~/hooks';
import { headerStateAtom } from '~/store/atoms/navigation';
import { arrivedAtom, stationsAtom } from '~/store/atoms/station';
import getStationNameR from '~/utils/getStationNameR';
import getIsPass from '../utils/isPass';
import isTablet from '../utils/isTablet';
import { ChevronSanyo } from './ChevronSanyo';
import {
  getHorizontalStationNameWidth,
  HORIZONTAL_STATION_NAME_FONT_SIZE,
  HORIZONTAL_STATION_NAME_MAX_CHARS,
} from './LineBoard/shared/styles/commonStyles';
import PadLineMarks from './PadLineMarks';
import Typography from './Typography';

interface Props {
  stations: Station[];
  hasTerminus: boolean;
}

// ほかのテーマと同じく左から右へ駅を並べる。左端が発車した駅(または停車中の駅)
const MAX_STATIONS = 8;
const BAR_HEIGHT = isTablet ? 48 : 32;
// 実物の駅番号の箱はバーの高さの約83%で、わずかに横長
const NUMBER_BOX_HEIGHT = Math.round(BAR_HEIGHT * 0.83);
const NUMBER_BOX_WIDTH = Math.round(NUMBER_BOX_HEIGHT * 1.08);
// 実物は記号と番号の字の高さがそれぞれ箱の高さの約4割で、2行の間は箱の高さの約5%あく
const NUMBER_FONT_SIZE = NUMBER_BOX_HEIGHT * 0.5;
// 実機で測ると、行の高さを箱の高さの39%にしたとき2行の間が写真と同じ約5%になる
const NUMBER_LINE_HEIGHT = NUMBER_BOX_HEIGHT * 0.39;
const ARROW_TIP_WIDTH = (BAR_HEIGHT * 44) / 48;
// 実物はバーと右端の飾りの右下に暗い影が落ちている
// (うっすら落ちる程度で、輪郭がはっきり見えるほど濃くはない)
// 実物の影は輪郭がぼやけているため、ぼかして落とす
const SHADOW_OFFSET_X = BAR_HEIGHT * 0.04;
const SHADOW_OFFSET_Y = BAR_HEIGHT * 0.08;
const SHADOW_BLUR = BAR_HEIGHT * 0.12;
const SHADOW_COLOR = 'rgba(60, 30, 60, 0.35)';
// 駅の間の白い「>」。実物はバーの高さに対して幅24%・高さ50%の、折れの浅い細い形
const SMALL_CHEVRON_WIDTH = BAR_HEIGHT * 0.24;
const TRANSFER_RULE_HEIGHT = Math.max(2, Math.round(BAR_HEIGHT * 0.08));
const TRANSFER_AREA_HEIGHT = isTablet ? 120 : 64;
const NAME_AREA_PADDING_BOTTOM = isTablet ? 12 : 6;
// 斜め書きの駅名は中心を軸に回すため、回転で下に出る分だけ持ち上げてバーに重ならないようにする
// 英語の駅名はほかのテーマと同じ大きさ・同じ角度(55度)で斜めに組む
const EN_NAME_WIDTH = getHorizontalStationNameWidth(
  HORIZONTAL_STATION_NAME_MAX_CHARS
);
const EN_NAME_LINE_HEIGHT = HORIZONTAL_STATION_NAME_FONT_SIZE * 1.2;
const EN_NAME_COS = Math.cos((55 * Math.PI) / 180);
const EN_NAME_SIN = Math.sin((55 * Math.PI) / 180);
const MAX_NAME_FONT_SIZE = isTablet ? 56 : 32;
// 配色は実物の写真から測った値(盤面の白で色かぶりを補正したもの)
const NAME_COLOR = '#222';
// 通過済みの駅は薄い灰色で表す
const PASSED_COLOR = '#B4B4B4';
// 実物の駅番号は路線を問わず濃い灰色で書かれている
const NUMBER_COLOR = '#444';
// 停車中の駅の駅番号は青地に白抜きで示す
const CURRENT_BOX_COLOR = '#5B97EB';

// 実物のバーは上半分が桃色、下半分が赤の2色に塗り分けられ、通過済みの区間は薄い灰色になる。
// 直通先の区間でも路線色に切り替えない
export const SANYO_BAR_COLORS = { top: '#FF4E74', bottom: '#EB2F1A' } as const;
export const SANYO_PASSED_BAR_COLORS = {
  top: '#DADADA',
  bottom: '#C4C4C4',
} as const;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: isTablet ? 24 : 12,
    paddingHorizontal: isTablet ? 32 : 16,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  column: {
    alignItems: 'center',
  },
  nameArea: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingBottom: NAME_AREA_PADDING_BOTTOM,
  },
  // 字数に関わらず上端と下端を揃え、字を均等に割り付ける(2文字なら上と下)
  nameChars: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameChar: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  nameEnWrapper: {
    flex: 1,
    alignSelf: 'stretch',
    overflow: 'visible',
  },
  nameEn: {
    position: 'absolute',
    fontSize: HORIZONTAL_STATION_NAME_FONT_SIZE,
    lineHeight: EN_NAME_LINE_HEIGHT,
    fontWeight: 'bold',
    textAlign: 'left',
    width: EN_NAME_WIDTH,
    transform: [{ rotate: '-55deg' }],
  },
  barArea: {
    height: BAR_HEIGHT,
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  barHalf: {
    flex: 1,
  },
  // 駅ごとのバーに影を付けると隣の駅のバーへにじむため、バー全体の後ろに1本だけ敷く
  barShadowStrip: {
    position: 'absolute',
    left: 0,
    bottom: TRANSFER_AREA_HEIGHT,
    height: BAR_HEIGHT,
    backgroundColor: SANYO_BAR_COLORS.bottom,
    boxShadow: `${SHADOW_OFFSET_X}px ${SHADOW_OFFSET_Y}px ${SHADOW_BLUR}px ${SHADOW_COLOR}`,
  },
  // 前の駅の番号の箱との間の中央(枠の左端)に置く。左隣の駅は先に描かれるため、はみ出しても隠れない
  smallChevron: {
    position: 'absolute',
    left: -SMALL_CHEVRON_WIDTH / 2,
    top: (BAR_HEIGHT - BAR_HEIGHT * 0.5) / 2,
  },
  currentChevron: {
    position: 'absolute',
    zIndex: 1,
    top: 0,
    // 実物の幅はバーの高さの半分
    width: BAR_HEIGHT * 0.5,
    height: BAR_HEIGHT,
  },
  numberBox: {
    width: NUMBER_BOX_WIDTH,
    height: NUMBER_BOX_HEIGHT,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#B8BCC8',
    borderRadius: isTablet ? 4 : 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberBoxPassed: {
    backgroundColor: '#F4F4F4',
    borderColor: PASSED_COLOR,
  },
  numberBoxCurrent: {
    backgroundColor: CURRENT_BOX_COLOR,
    borderColor: '#fff',
  },
  // 実物は路線記号と番号を同じ大きさで2段に組み、字は細い。
  // 書体は Typography の既定(太字を指定しなければ Roboto Regular)に任せる
  lineSymbol: {
    fontSize: NUMBER_FONT_SIZE,
    lineHeight: NUMBER_LINE_HEIGHT,
    textAlign: 'center',
    includeFontPadding: false,
  },
  stationNumber: {
    fontSize: NUMBER_FONT_SIZE,
    lineHeight: NUMBER_LINE_HEIGHT,
    textAlign: 'center',
    includeFontPadding: false,
  },
  transferArea: {
    height: TRANSFER_AREA_HEIGHT,
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingTop: isTablet ? 8 : 6,
  },
  // 乗換があることを示す棒。実物はバーの高さの約8%の太さで、駅の枠の約75%の幅。
  // 中間の灰色で、両端が丸い
  transferRule: {
    alignSelf: 'center',
    width: '75%',
    height: TRANSFER_RULE_HEIGHT,
    borderRadius: TRANSFER_RULE_HEIGHT / 2,
    backgroundColor: '#8A93AE',
  },
  arrowTip: {
    width: ARROW_TIP_WIDTH,
    height: BAR_HEIGHT,
  },
  tipColumn: {
    justifyContent: 'flex-end',
  },
  tipSpacer: {
    flex: 1,
  },
  terminal: {
    width: isTablet ? 12 : 8,
    height: BAR_HEIGHT,
    borderTopRightRadius: isTablet ? 6 : 4,
    borderBottomRightRadius: isTablet ? 6 : 4,
    // 角丸を上下の塗り分けごと切り抜く
    overflow: 'hidden',
  },
});

const BarFill: React.FC<{
  colors: { top: string; bottom: string };
  style: StyleProp<ViewStyle>;
}> = ({ colors, style }) => (
  <View style={style} testID="sanyoBarFill" accessibilityHint={colors.top}>
    <View style={[styles.barHalf, { backgroundColor: colors.top }]} />
    <View style={[styles.barHalf, { backgroundColor: colors.bottom }]} />
  </View>
);

// 駅の間に入る白い小さな「>」
const SmallChevron: React.FC = () => (
  <Svg
    width={SMALL_CHEVRON_WIDTH}
    height={BAR_HEIGHT * 0.5}
    viewBox="0 0 10 20"
    preserveAspectRatio="none"
    style={styles.smallChevron}
    testID="smallChevronSanyo"
  >
    <Polygon points="0,0 5.4,0 10,10 5.4,20 0,20 4.6,10" fill="#fff" />
  </Svg>
);

// 終点の先へ続くことを示す右端の飾り。実物はバーの先端を浅くとがらせ、
// 少し離して左辺がへこんだ矢羽根形のブロックを1つ置く。どちらもバーと同じ2色
const ArrowTip: React.FC = () => {
  // viewBox は高さ 48 の座標系。ぼかしがはみ出す分の余白を右と下に取る
  const unit = 48 / BAR_HEIGHT;
  const pad = (SHADOW_BLUR * 2 + SHADOW_OFFSET_Y) * unit;
  const filterId = useId();
  return (
    <Svg
      width={ARROW_TIP_WIDTH + pad / unit}
      height={BAR_HEIGHT + pad / unit}
      viewBox={`0 0 ${44 + pad} ${48 + pad}`}
      style={{ marginBottom: -pad / unit, marginRight: -pad / unit }}
    >
      <Defs>
        <Filter id={filterId} x="-20%" y="-20%" width="160%" height="160%">
          <FeGaussianBlur stdDeviation={(SHADOW_BLUR / 2) * unit} />
        </Filter>
      </Defs>
      <G
        filter={`url(#${filterId})`}
        transform={`translate(${SHADOW_OFFSET_X * unit}, ${SHADOW_OFFSET_Y * unit})`}
      >
        <Polygon points="0,0 2,0 12,24 2,48 0,48" fill={SHADOW_COLOR} />
        <Polygon points="6,0 32,0 42,24 32,48 6,48 16,24" fill={SHADOW_COLOR} />
      </G>
      <Polygon points="0,0 2,0 12,24 0,24" fill={SANYO_BAR_COLORS.top} />
      <Polygon points="0,24 12,24 2,48 0,48" fill={SANYO_BAR_COLORS.bottom} />
      <Polygon points="6,0 32,0 42,24 16,24" fill={SANYO_BAR_COLORS.top} />
      <Polygon points="16,24 42,24 32,48 6,48" fill={SANYO_BAR_COLORS.bottom} />
    </Svg>
  );
};

const useStationCellState = (
  station: Station,
  index: number,
  stations: Station[]
) => {
  const arrived = useAtomValue(arrivedAtom);
  // 現在地基準の現在駅(到着取りこぼし時はヘッダーの「まもなく」と一致する側へ自己修復)
  const currentStation = useDisplayCurrentStation();
  const transferLines = useTransferLinesFromStation(station, {
    omitJR: true,
    omitRepeatingLine: true,
  });

  const currentStationIndex = useMemo(
    () => stations.findIndex((s) => s.groupId === currentStation?.groupId),
    [currentStation?.groupId, stations]
  );

  const passed = useMemo(
    () => index <= currentStationIndex || (!index && !arrived),
    [arrived, currentStationIndex, index]
  );
  const currentIndex = Math.max(currentStationIndex, 0);
  const isCurrent = index === currentIndex;
  // 走行中は、現在駅と次の駅の境目(次の駅の枠の左端)に現在位置を示す
  const isNextOfCurrent = !arrived && index === currentIndex + 1;

  const shouldGrayscale = useMemo(
    () => getIsPass(station) || (arrived && isCurrent ? false : passed),
    [arrived, isCurrent, passed, station]
  );

  return {
    arrived,
    isCurrent,
    isNextOfCurrent,
    passed,
    shouldGrayscale,
    transferLines,
  };
};

const StationNumberBox: React.FC<{
  station: Station;
  grayscale: boolean;
  current: boolean;
}> = ({ station, grayscale, current }) => {
  const getStationNumberIndex = useStationNumberIndexFunc();
  const numberingObj = useMemo<StationNumber | undefined>(
    () => station.stationNumbers?.[getStationNumberIndex(station)],
    [getStationNumberIndex, station]
  );

  const [lineSymbol, ...rest] = numberingObj?.stationNumber?.split('-') ?? [];
  const stationNumber = rest.join('');
  const color = current ? '#fff' : grayscale ? PASSED_COLOR : NUMBER_COLOR;

  return (
    <View
      style={[
        styles.numberBox,
        grayscale && styles.numberBoxPassed,
        current && styles.numberBoxCurrent,
      ]}
      testID={current ? 'currentNumberBoxSanyo' : undefined}
    >
      {lineSymbol ? (
        <>
          <Typography style={[styles.lineSymbol, { color }]}>
            {lineSymbol}
          </Typography>
          {stationNumber ? (
            <Typography style={[styles.stationNumber, { color }]}>
              {stationNumber}
            </Typography>
          ) : null}
        </>
      ) : null}
    </View>
  );
};

const StationNameVertical: React.FC<{
  name: string;
  color: string;
  areaHeight: number;
  columnWidth: number;
}> = ({ name, color, areaHeight, columnWidth }) => {
  const chars = useMemo(() => [...name], [name]);
  // 実物は駅名の字の大きさを揃え、4文字に収まらない駅名だけを縮めている
  const fontSize = Math.max(
    8,
    Math.min(
      MAX_NAME_FONT_SIZE,
      columnWidth * 0.55,
      areaHeight > 0
        ? areaHeight / (Math.max(chars.length, 4) * 1.15)
        : MAX_NAME_FONT_SIZE
    )
  );
  return (
    <View
      style={[
        styles.nameChars,
        chars.length === 1 && { justifyContent: 'flex-start' },
      ]}
    >
      {chars.map((ch, i) => (
        <Typography
          // biome-ignore lint/suspicious/noArrayIndexKey: 同じ字が駅名に繰り返し現れるため位置で区別する
          key={`${ch}-${i}`}
          style={[
            styles.nameChar,
            { color, fontSize, lineHeight: fontSize * 1.15 },
          ]}
        >
          {ch}
        </Typography>
      ))}
    </View>
  );
};

// 斜め書きの駅名。書き出し(回転後の左下の角)が駅の真上、駅名欄の下端に来るよう置く。
// 箱は中心を軸に回るため、回転後の左下の角の位置を求め、その分だけ回転前の箱をずらしておく
const StationNameDiagonal: React.FC<{
  name: string;
  color: string;
  columnWidth: number;
}> = ({ name, color, columnWidth }) => {
  const lines = name.split('\n').length;
  const w = EN_NAME_WIDTH;
  const h = EN_NAME_LINE_HEIGHT * lines;
  // 回転後の左下の角の、箱の中心からの位置(右・下が正)
  const cornerX = (-w / 2) * EN_NAME_COS + (h / 2) * EN_NAME_SIN;
  const cornerY = (w / 2) * EN_NAME_SIN + (h / 2) * EN_NAME_COS;
  // 角を (枠の中央, 駅名欄の下端) に合わせたときの箱の中心
  const centerX = columnWidth / 2 - cornerX;
  return (
    <Typography
      style={[
        styles.nameEn,
        {
          color,
          left: centerX - w / 2,
          bottom: cornerY - h / 2,
        },
      ]}
    >
      {name}
    </Typography>
  );
};

interface StationColumnProps {
  station: Station;
  index: number;
  stations: Station[];
  columnWidth: number;
  nameAreaHeight: number;
  // 手前の駅との間に通過駅があるか
  hasPassBefore: boolean;
}

const StationColumn: React.FC<StationColumnProps> = ({
  station,
  index,
  stations,
  columnWidth,
  nameAreaHeight,
  hasPassBefore,
}: StationColumnProps) => {
  // 実物は補足の行が中国語の間も路線図を日本語のまま出す。英語にするのは英語の表示中だけ
  const headerState = useAtomValue(headerStateAtom);
  const isEn = headerState.endsWith('_EN');
  const {
    arrived,
    isCurrent,
    isNextOfCurrent,
    passed,
    shouldGrayscale,
    transferLines,
  } = useStationCellState(station, index, stations);

  const nameColor = shouldGrayscale ? PASSED_COLOR : NAME_COLOR;
  // 走行中は現在駅の枠まで灰色にする。停車中の駅の枠は、実物に合わせて赤のまま青い箱だけで示す
  const barFullyPassed = passed && !(isCurrent && arrived);

  return (
    <View style={[styles.column, { width: columnWidth }]}>
      <View style={styles.nameArea}>
        {isEn ? (
          // 英語の駅名はほかのテーマと同じく斜めに組む
          <View style={styles.nameEnWrapper}>
            <StationNameDiagonal
              name={getStationNameR(station)}
              color={nameColor}
              columnWidth={columnWidth}
            />
          </View>
        ) : (
          <StationNameVertical
            name={station.name ?? ''}
            color={nameColor}
            areaHeight={nameAreaHeight}
            columnWidth={columnWidth}
          />
        )}
      </View>
      <View style={styles.barArea}>
        <BarFill
          colors={barFullyPassed ? SANYO_PASSED_BAR_COLORS : SANYO_BAR_COLORS}
          style={styles.bar}
        />
        {isNextOfCurrent ? (
          <View
            style={[styles.currentChevron, { left: 0 }]}
            testID="currentChevronSanyo"
          >
            <ChevronSanyo />
          </View>
        ) : hasPassBefore ? (
          // 実物は間に通過駅があるときだけ白い「>」を置く
          <SmallChevron />
        ) : null}
        <StationNumberBox
          station={station}
          grayscale={getIsPass(station) || (passed && !arrived)}
          current={isCurrent && arrived}
        />
      </View>
      <View style={styles.transferArea}>
        {transferLines.length ? <View style={styles.transferRule} /> : null}
        <PadLineMarks
          shouldGrayscale={shouldGrayscale}
          transferLines={transferLines}
          station={station}
        />
      </View>
    </View>
  );
};

export const getPassBetween = (
  visible: Station[],
  all: Station[]
): boolean[] => {
  const indexById = new Map<number, number>();
  all.forEach((s, i) => {
    if (s.id != null) {
      indexById.set(s.id, i);
    }
  });
  return visible.slice(0, -1).map((s, i) => {
    const a = s.id != null ? indexById.get(s.id) : undefined;
    const next = visible[i + 1];
    const b = next?.id != null ? indexById.get(next.id) : undefined;
    if (a == null || b == null) {
      return false;
    }
    const [from, to] = a < b ? [a, b] : [b, a];
    return all.slice(from + 1, to).some((st) => getIsPass(st));
  });
};

const LineBoardSanyo: React.FC<Props> = ({ stations, hasTerminus }: Props) => {
  const [rowSize, setRowSize] = useState({ width: 0, height: 0 });
  // 路線図に渡る駅は通過駅を抜いたあとなので、通過駅を含む全駅の並びと突き合わせる
  const allStations = useAtomValue(stationsAtom);

  const columnWidth = useMemo(
    () => Math.max(0, (rowSize.width - ARROW_TIP_WIDTH) / MAX_STATIONS),
    [rowSize.width]
  );
  // 駅名欄の高さ。各駅の字の大きさを決めるのに使う
  const nameAreaHeight = useMemo(
    () =>
      Math.max(
        0,
        rowSize.height -
          BAR_HEIGHT -
          TRANSFER_AREA_HEIGHT -
          NAME_AREA_PADDING_BOTTOM
      ),
    [rowSize.height]
  );

  const handleRowLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setRowSize({ width, height });
  }, []);

  const visibleStations = useMemo(
    () => stations.slice(0, MAX_STATIONS),
    [stations]
  );

  // passBetween[i]: visibleStations[i] と [i + 1] の間に通過駅があるか
  const passBetween = useMemo(
    () => getPassBetween(visibleStations, allStations),
    [allStations, visibleStations]
  );

  return (
    <View style={styles.root}>
      <View style={styles.row} onLayout={handleRowLayout}>
        {columnWidth > 0 ? (
          <>
            <View
              style={[
                styles.barShadowStrip,
                { width: columnWidth * visibleStations.length },
              ]}
              pointerEvents="none"
            />
            {visibleStations.map((s, i) => (
              <StationColumn
                key={s.id}
                station={s}
                index={i}
                stations={visibleStations}
                columnWidth={columnWidth}
                nameAreaHeight={nameAreaHeight}
                hasPassBefore={i > 0 && passBetween[i - 1]}
              />
            ))}
            <View style={[styles.column, styles.tipColumn]}>
              <View style={styles.tipSpacer} />
              {hasTerminus ? (
                <BarFill colors={SANYO_BAR_COLORS} style={styles.terminal} />
              ) : (
                <ArrowTip />
              )}
              <View style={styles.transferArea} />
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
};

export default React.memo(LineBoardSanyo);

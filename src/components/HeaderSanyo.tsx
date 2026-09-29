import { useAtomValue } from 'jotai';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Station } from '~/@types/graphql';
import { parenthesisRegexp } from '~/constants';
import {
  useBounds,
  useDisplayNextStation,
  useLandscapeWindowDimensions,
  useLoopLine,
} from '~/hooks';
import type { HeaderLangState } from '~/models/HeaderTransitionState';
import { stationsAtom } from '~/store/atoms/station';
import { translate } from '~/translation';
import isTablet from '~/utils/isTablet';
import katakanaToHiragana from '~/utils/kanaToHiragana';
import type { CommonHeaderProps } from './Header.types';
import HeaderStationName from './HeaderStationName';
import NumberingIcon from './NumberingIcon';
import TrainTypeBoxSanyo from './TrainTypeBoxSanyo';
import Typography from './Typography';

// 寸法と配色は実物の写真から測った値。寸法は画面の幅(W)と高さ(H)に対する比率で持つ
export const SANYO_HEADER_HEIGHT_RATIO = 0.395;
const HEADER_BG_COLOR = '#2B3F89';
const BOUND_BOX_BG_COLOR = '#E9EEF3';
const BOUND_TEXT_COLOR = '#333';
// NumberingIcon の既定の直径。実物の大きさに合わせて縮尺を求めるのに使う
const NUMBERING_ICON_BASE_SIZE = isTablet ? 108 : 72;

const styles = StyleSheet.create({
  root: {
    zIndex: 9999,
    backgroundColor: HEADER_BG_COLOR,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
  boundBox: {
    backgroundColor: BOUND_BOX_BG_COLOR,
    borderWidth: 1,
    borderColor: '#C5CCD8',
  },
  boundLine: {
    justifyContent: 'center',
  },
  absoluteCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  boundText: {
    color: BOUND_TEXT_COLOR,
  },
  whiteText: {
    color: '#fff',
  },
  bold: {
    fontWeight: 'bold',
  },
  stationNameText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  centerItems: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

type Texts = {
  stateMain: string;
  stateSub: string;
  stationMain: string;
  stationSub: string;
};

const stripParenthesis = (s: string | null | undefined): string =>
  (s ?? '').replace(parenthesisRegexp, '');

const stationSubText = (
  station: Station | null | undefined,
  lang: HeaderLangState
): string => {
  if (!station) {
    return '';
  }
  switch (lang) {
    case 'EN':
      return stripParenthesis(station.nameRoman);
    case 'ZH':
      return stripParenthesis(station.nameChinese);
    case 'KO':
      return stripParenthesis(station.nameKorean);
    default:
      // 実物は日本語の表示中、駅名の読みをひらがなで添える
      return katakanaToHiragana(station.nameKatakana);
  }
};

// 実物は主表示を常に日本語で出し、その下の補足の行だけを言語ごとに切り替える。
// 表示の切り替えで畳み込むアニメーションもしないため、文字を差し替えるだけにする
const HeaderSanyo: React.FC<CommonHeaderProps> = (props) => {
  const {
    selectedBound,
    currentStation,
    nextStation,
    headerState,
    headerLangState,
    currentStationNumber,
    threeLetterCode,
    numberingColor,
    trainType,
    isLast,
  } = props;

  const { width: W, height: H } = useLandscapeWindowDimensions();
  const stations = useAtomValue(stationsAtom);
  const { directionalStops } = useBounds(stations);
  const { isLoopLine } = useLoopLine();
  // まもなく表示時は現在地基準で実際に接近している駅を「次の駅」として見せる
  const displayNextStation = useDisplayNextStation();

  const baseState = selectedBound
    ? (headerState.split('_')[0] as 'CURRENT' | 'NEXT' | 'ARRIVING')
    : 'CURRENT';

  const texts = useMemo<Texts>(() => {
    const station =
      baseState === 'CURRENT'
        ? currentStation
        : (displayNextStation ?? nextStation);

    const stateMain = (() => {
      switch (baseState) {
        case 'NEXT':
          return isLast ? 'つぎは終点' : 'つぎは';
        case 'ARRIVING':
          return isLast ? 'まもなく終点' : 'まもなく';
        default:
          return 'ただいま';
      }
    })();

    const stateSub = (() => {
      switch (headerLangState) {
        case 'ZH':
          // 実物は繁体字と簡体字を並べるが、アプリは駅名も簡体字しか持たないため簡体字だけにそろえる
          if (baseState === 'NEXT') {
            return '下一站';
          }
          if (baseState === 'ARRIVING') {
            return translate('soonZh');
          }
          return '这一站';
        case 'EN':
          if (baseState === 'NEXT') {
            return translate('nextEn');
          }
          if (baseState === 'ARRIVING') {
            return translate('soonEn');
          }
          return translate('nowStoppingAtEn');
        case 'KO':
          if (baseState === 'NEXT') {
            return translate('nextKo');
          }
          if (baseState === 'ARRIVING') {
            return translate('soonKo');
          }
          return translate('nowStoppingAtKo');
        default:
          // 主表示がかなのため、日本語の表示中は添えない
          return '';
      }
    })();

    return {
      stateMain,
      stateSub,
      stationMain: stripParenthesis(station?.name),
      stationSub: stationSubText(station, headerLangState),
    };
  }, [
    baseState,
    currentStation,
    displayNextStation,
    headerLangState,
    isLast,
    nextStation,
  ]);

  const bound = useMemo(() => {
    if (!selectedBound || !directionalStops.length) {
      return null;
    }
    const join = (
      pick: (s: Station) => string | null | undefined,
      sep = '・'
    ) => directionalStops.map((s) => stripParenthesis(pick(s))).join(sep);

    const main = join((s) => s.name);
    const suffix = isLoopLine ? '方面' : 'ゆき';
    switch (headerLangState) {
      case 'EN':
        return {
          main,
          suffix,
          sub: join((s) => s.nameRoman, ' & '),
          prefixSub: 'for',
          suffixSub: '',
        };
      case 'ZH':
        return {
          main,
          suffix,
          sub: join((s) => s.nameChinese),
          // 実物は「ゆき」の訳を行の左に置く(繁体字との併記は省き、簡体字だけにする)
          prefixSub: '开往',
          suffixSub: '',
        };
      case 'KO':
        return {
          main,
          suffix,
          sub: join((s) => s.nameKorean),
          prefixSub: '',
          suffixSub: '행',
        };
      default:
        return {
          main,
          suffix,
          sub: join((s) => katakanaToHiragana(s.nameKatakana)),
          prefixSub: '',
          suffixSub: '',
        };
    }
  }, [directionalStops, headerLangState, isLoopLine, selectedBound]);

  const layout = useMemo(() => {
    const padX = W * 0.018;
    const topRowHeight = H * 0.134;
    const boundBoxWidth = W * 0.595;
    const stationFontSize = H * 0.135;
    const boundFontSize = H * 0.08;
    return {
      padX,
      topRowTop: H * 0.02,
      topRowHeight,
      typeBoxWidth: W * 0.2,
      boundBoxMarginLeft: W * 0.0135,
      boundBoxWidth,
      boundLine1Height: topRowHeight * 0.64,
      boundLine2Height: topRowHeight * 0.3,
      boundFontSize,
      boundSuffixFontSize: H * 0.055,
      boundSubFontSize: H * 0.032,
      mainRowTop: 0,
      // 実物は駅名と下の行の間が画面の高さの約2%あく。ヘッダーの高さを保つため駅名の段を上に寄せた分をここに回す
      subRowTop: H * 0.01,
      // 下の行の下に実物と同じ約1.5%の余白が残るよう、駅名の段の高さを決める
      mainRowHeight: H * 0.16,
      stateWidth: W * 0.2,
      stateFontSize: H * 0.068,
      stationAreaMarginLeft: W * 0.016,
      stationAreaWidth: W * 0.63,
      stationFontSize,
      numberingWidth: W * 0.1,
      numberingOffsetY: H * 0.042,
      numberingScale: (H * 0.148) / NUMBERING_ICON_BASE_SIZE,
      // 実物の補足の行は字の高さが画面の高さの約4%(字の大きさで約4.6%)
      subRowHeight: H * 0.056,
      subFontSize: H * 0.046,
    };
  }, [W, H]);

  return (
    <View
      style={[
        styles.root,
        {
          height: H * SANYO_HEADER_HEIGHT_RATIO,
          paddingHorizontal: layout.padX,
        },
      ]}
    >
      <View
        style={[
          styles.row,
          { marginTop: layout.topRowTop, height: layout.topRowHeight },
        ]}
      >
        <TrainTypeBoxSanyo
          trainType={trainType}
          subLangState={headerLangState}
          width={layout.typeBoxWidth}
          height={layout.topRowHeight}
        />
        <View
          style={[
            styles.boundBox,
            {
              marginLeft: layout.boundBoxMarginLeft,
              width: layout.boundBoxWidth,
              height: layout.topRowHeight,
              borderRadius: layout.topRowHeight * 0.1,
            },
          ]}
          testID="boundBoxSanyo"
        >
          {bound ? (
            <>
              <View
                style={[styles.boundLine, { height: layout.boundLine1Height }]}
              >
                <Typography
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={[
                    styles.absoluteCenter,
                    styles.boundText,
                    {
                      fontSize: layout.boundFontSize,
                      fontWeight: 'bold',
                      paddingHorizontal: layout.boundBoxWidth * 0.2,
                    },
                  ]}
                >
                  {bound.main}
                </Typography>
                <Typography
                  style={[
                    styles.boundText,
                    {
                      position: 'absolute',
                      right: layout.boundBoxWidth * 0.07,
                      fontSize: layout.boundSuffixFontSize,
                    },
                  ]}
                >
                  {bound.suffix}
                </Typography>
              </View>
              <View
                style={[styles.boundLine, { height: layout.boundLine2Height }]}
              >
                <Typography
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={[
                    styles.absoluteCenter,
                    styles.boundText,
                    {
                      fontSize: layout.boundSubFontSize,
                      fontWeight: 'bold',
                      paddingHorizontal: layout.boundBoxWidth * 0.28,
                    },
                  ]}
                >
                  {bound.sub}
                </Typography>
                {bound.prefixSub ? (
                  <Typography
                    style={[
                      styles.boundText,
                      {
                        position: 'absolute',
                        left: layout.boundBoxWidth * 0.05,
                        fontSize: layout.boundSubFontSize,
                        fontWeight: 'bold',
                      },
                    ]}
                  >
                    {bound.prefixSub}
                  </Typography>
                ) : null}
                {bound.suffixSub ? (
                  <Typography
                    style={[
                      styles.boundText,
                      {
                        position: 'absolute',
                        right: layout.boundBoxWidth * 0.08,
                        fontSize: layout.boundSubFontSize,
                        fontWeight: 'bold',
                      },
                    ]}
                  >
                    {bound.suffixSub}
                  </Typography>
                ) : null}
              </View>
            </>
          ) : null}
        </View>
      </View>

      <View
        style={[
          styles.row,
          {
            marginTop: layout.mainRowTop,
            height: layout.mainRowHeight,
            alignItems: 'flex-end',
          },
        ]}
      >
        <View style={{ width: layout.stateWidth }}>
          <Typography
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[
              styles.whiteText,
              styles.bold,
              { fontSize: layout.stateFontSize },
            ]}
          >
            {texts.stateMain}
          </Typography>
        </View>
        <View
          style={{
            width: layout.stationAreaWidth,
            marginLeft: layout.stationAreaMarginLeft,
          }}
        >
          <HeaderStationName
            TextComponent={Typography}
            text={texts.stationMain}
            textStyle={[
              styles.stationNameText,
              {
                fontSize: layout.stationFontSize,
                // 行の高さを指定しないと、Android で大きな漢字の上端が文字の枠からはみ出して欠ける
                lineHeight: layout.stationFontSize * 1.3,
              },
            ]}
          />
        </View>
        <View
          style={[
            styles.centerItems,
            {
              width: layout.numberingWidth,
              height: layout.mainRowHeight,
              // 実物は円の中心が駅名の字の中心より画面の高さの約3%下にある
              transform: [
                { translateY: layout.numberingOffsetY },
                { scale: layout.numberingScale },
              ],
            },
          ]}
        >
          {currentStationNumber ? (
            <NumberingIcon
              shape={currentStationNumber.lineSymbolShape || ''}
              lineColor={numberingColor}
              stationNumber={currentStationNumber.stationNumber || ''}
              threeLetterCode={threeLetterCode}
            />
          ) : null}
        </View>
      </View>

      <View
        style={[
          styles.row,
          {
            height: layout.subRowHeight,
            marginTop: layout.subRowTop,
            alignItems: 'center',
          },
        ]}
      >
        <View style={{ width: layout.stateWidth }}>
          <Typography
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[
              styles.whiteText,
              styles.bold,
              {
                fontSize: layout.subFontSize,
                lineHeight: layout.subFontSize * 1.2,
              },
            ]}
          >
            {texts.stateSub}
          </Typography>
        </View>
        <View
          style={{
            width: layout.stationAreaWidth,
            marginLeft: layout.stationAreaMarginLeft,
          }}
        >
          <Typography
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[
              styles.whiteText,
              styles.bold,
              {
                fontSize: layout.subFontSize,
                lineHeight: layout.subFontSize * 1.2,
                textAlign: 'center',
              },
            ]}
          >
            {texts.stationSub}
          </Typography>
        </View>
      </View>
    </View>
  );
};

export default React.memo(HeaderSanyo);

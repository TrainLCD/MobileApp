import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRecoilValue } from 'recoil';
import { STATION_NAME_FONT_SIZE, parenthesisRegexp } from '../constants';
import { useBoundText } from '../hooks/useBoundText';
import useConnectedLines from '../hooks/useConnectedLines';
import { useCurrentLine } from '../hooks/useCurrentLine';
import { useCurrentStation } from '../hooks/useCurrentStation';
import useCurrentTrainType from '../hooks/useCurrentTrainType';
import useIsNextLastStop from '../hooks/useIsNextLastStop';
import useLazyPrevious from '../hooks/useLazyPrevious';
import { useNextStation } from '../hooks/useNextStation';
import { useNumbering } from '../hooks/useNumbering';
import { usePrevious } from '../hooks/usePrevious';
import type { HeaderLangState } from '../models/HeaderTransitionState';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import tuningState from '../store/atoms/tuning';
import { translate } from '../translation';
import isTablet from '../utils/isTablet';
import katakanaToHiragana from '../utils/kanaToHiragana';
import { getNumberingColor } from '../utils/numbering';
import { RFValue } from '../utils/rfValue';
import Clock from './Clock';
import NumberingIcon from './NumberingIcon';
import TrainTypeBox from './TrainTypeBoxSaikyo';

const { width: screenWidth } = Dimensions.get('screen');

const styles = StyleSheet.create({
  gradientRoot: {
    paddingRight: 21,
    paddingLeft: 21,
    overflow: 'hidden',
  },
  bottom: {
    height: isTablet ? 128 : 84,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingBottom: isTablet ? 4 : 2,
  },
  boundWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginLeft: 8,
  },
  connectedLines: {
    fontWeight: 'bold',
    color: '#555',
    fontSize: RFValue(14),
  },
  boundTextContainer: {
    position: 'absolute',
  },
  boundText: {
    color: '#555',
    fontWeight: 'bold',
    fontSize: RFValue(18),
    position: 'absolute',
  },
  stateWrapper: {
    width: screenWidth * 0.14,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    marginRight: 12,
    marginBottom: isTablet ? 8 : 4,
  },
  state: {
    position: 'absolute',
    fontSize: RFValue(18),
    fontWeight: 'bold',
    color: '#3a3a3a',
    textAlign: 'right',
    lineHeight: Platform.select({ android: RFValue(21) }),
  },
  stationNameWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  stationNameContainer: {
    position: 'absolute',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  stationName: {
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#3a3a3a',
  },
  headerTexts: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clockOverride: {
    position: 'absolute',
    bottom: 0,
  },
});

type HeaderBarProps = {
  lineColor: string;
  height: number;
};

const headerBarStyles = StyleSheet.create({
  root: {
    width: '100%',
    backgroundColor: 'black',
  },
  gradient: {
    flex: 1,
  },
});

const HeaderBar: React.FC<HeaderBarProps> = ({
  lineColor,
  height,
}: HeaderBarProps) => (
  <View style={[headerBarStyles.root, { height }]}>
    <LinearGradient
      style={headerBarStyles.gradient}
      colors={[
        '#fcfcfc',
        `${lineColor}bb`,
        `${lineColor}bb`,
        `${lineColor}bb`,
        '#fcfcfc',
      ]}
      locations={[0, 0.2, 0.5, 0.8, 1]}
      start={[0, 0]}
      end={[1, 1]}
    />
  </View>
);

const HeaderSaikyo: React.FC = () => {
  const currentStation = useCurrentStation();
  const currentLine = useCurrentLine();
  const nextStation = useNextStation();

  const [fadeOutFinished, setFadeOutFinished] = useState(false);
  const { selectedBound, arrived } = useRecoilValue(stationState);
  const { headerState } = useRecoilValue(navigationState);
  const { headerTransitionDelay } = useRecoilValue(tuningState);

  const connectedLines = useConnectedLines();
  const isLast = useIsNextLastStop();
  const trainType = useCurrentTrainType();
  const boundStationNameList = useBoundText();

  const connectionText = useMemo(
    () =>
      connectedLines
        ?.map((l) => l.nameShort.replace(parenthesisRegexp, ''))
        .slice(0, 2)
        .join('・'),
    [connectedLines]
  );

  const nameFadeAnim = useSharedValue<number>(1);
  const topNameScaleYAnim = useSharedValue<number>(0);
  const stateOpacityAnim = useSharedValue<number>(0);
  const boundOpacityAnim = useSharedValue<number>(0);
  const bottomNameScaleYAnim = useSharedValue<number>(1);

  const { right: safeAreaRight } = useSafeAreaInsets();
  const headerLangState = useMemo(
    () =>
      headerState.split('_')[1]?.length
        ? (headerState.split('_')[1] as HeaderLangState)
        : ('JA' as HeaderLangState),
    [headerState]
  );

  const boundText = useMemo(
    () => boundStationNameList[headerLangState],
    [boundStationNameList, headerLangState]
  );

  const stationText = useMemo<string>(() => {
    if (!selectedBound) {
      return currentStation?.name ?? '';
    }
    switch (headerState) {
      case 'ARRIVING':
        return nextStation?.name ?? '';
      case 'ARRIVING_KANA':
        return katakanaToHiragana(nextStation?.nameKatakana);
      case 'ARRIVING_EN': {
        return nextStation?.nameRoman ?? '';
      }
      case 'ARRIVING_ZH': {
        return nextStation?.nameChinese ?? '';
      }
      case 'ARRIVING_KO': {
        return nextStation?.nameKorean ?? '';
      }
      case 'CURRENT':
        return currentStation?.name ?? '';
      case 'CURRENT_KANA':
        return katakanaToHiragana(currentStation?.nameKatakana);
      case 'CURRENT_EN': {
        return currentStation?.nameRoman ?? '';
      }
      case 'CURRENT_ZH': {
        return currentStation?.nameChinese ?? '';
      }
      case 'CURRENT_KO': {
        return currentStation?.nameKorean ?? '';
      }
      case 'NEXT': {
        return nextStation?.name ?? '';
      }
      case 'NEXT_KANA':
        return katakanaToHiragana(nextStation?.nameKatakana);
      case 'NEXT_EN':
        return nextStation?.nameRoman ?? '';
      case 'NEXT_ZH':
        return nextStation?.nameChinese ?? '';
      case 'NEXT_KO':
        return nextStation?.nameKorean ?? '';
      default:
        return '';
    }
  }, [
    currentStation?.name,
    currentStation?.nameChinese,
    currentStation?.nameKatakana,
    currentStation?.nameKorean,
    currentStation?.nameRoman,
    headerState,
    nextStation?.name,
    nextStation?.nameChinese,
    nextStation?.nameKatakana,
    nextStation?.nameKorean,
    nextStation?.nameRoman,
    selectedBound,
  ]);

  const stateText = useMemo<string>(() => {
    if (!selectedBound) {
      return translate('nowStoppingAt');
    }
    switch (headerState) {
      case 'ARRIVING':
        return translate(isLast ? 'soonLast' : 'soon');
      case 'ARRIVING_KANA':
        return translate(isLast ? 'soonKanaLast' : 'soon');
      case 'ARRIVING_EN':
        return translate(isLast ? 'soonEnLast' : 'soonEn');
      case 'ARRIVING_ZH':
        return translate(isLast ? 'soonZhLast' : 'soonZh');
      case 'ARRIVING_KO':
        return translate(isLast ? 'soonKoLast' : 'soonKo');
      case 'CURRENT':
        return translate('nowStoppingAt');
      case 'CURRENT_KANA':
        return translate('nowStoppingAt');
      case 'CURRENT_EN':
      case 'CURRENT_ZH':
      case 'CURRENT_KO':
        return '';
      case 'NEXT':
        return translate(isLast ? 'nextLast' : 'next');
      case 'NEXT_KANA':
        return translate(isLast ? 'nextKanaLast' : 'nextKana');
      case 'NEXT_EN':
        return translate(isLast ? 'nextEnLast' : 'nextEn');
      case 'NEXT_ZH':
        return translate(isLast ? 'nextZhLast' : 'nextZh');
      case 'NEXT_KO':
        return translate(isLast ? 'nextKoLast' : 'nextKo');
      default:
        return '';
    }
  }, [headerState, isLast, selectedBound]);

  const prevHeaderState = useLazyPrevious(headerState, fadeOutFinished);

  const prevStationText = usePrevious(stationText);
  const prevStateText = usePrevious(stateText);
  const prevBoundText = usePrevious(boundText);
  const prevConnectionText = usePrevious(connectionText);

  const isJapaneseState = useMemo(
    () => headerLangState === 'JA' || headerLangState === 'KANA',
    [headerLangState]
  );

  const prevBoundIsDifferent = useMemo(
    () => prevBoundText !== boundText,
    [boundText, prevBoundText]
  );

  const fadeIn = useCallback(() => {
    if (!selectedBound) {
      if (prevHeaderState === headerState) {
        topNameScaleYAnim.value = 0;
        nameFadeAnim.value = 1;
        bottomNameScaleYAnim.value = 1;
        stateOpacityAnim.value = 0;
        setFadeOutFinished(true);
      }
      return;
    }

    const handleFinish = (finished: boolean | undefined) => {
      if (finished) {
        setFadeOutFinished(true);
      }
    };

    if (prevHeaderState !== headerState) {
      topNameScaleYAnim.value = withTiming(0, {
        duration: headerTransitionDelay,
        easing: Easing.linear,
      });
      nameFadeAnim.value = withTiming(
        1,
        {
          duration: headerTransitionDelay,
          easing: Easing.linear,
        },
        (finished) => runOnJS(handleFinish)(finished)
      );
      bottomNameScaleYAnim.value = withTiming(1, {
        duration: headerTransitionDelay,
        easing: Easing.linear,
      });
      stateOpacityAnim.value = withTiming(0, {
        duration: headerTransitionDelay,
        easing: Easing.linear,
      });
    }
    if (prevBoundIsDifferent) {
      boundOpacityAnim.value = withTiming(0, {
        duration: headerTransitionDelay,
        easing: Easing.linear,
      });
    }
  }, [
    bottomNameScaleYAnim,
    boundOpacityAnim,
    headerState,
    headerTransitionDelay,
    nameFadeAnim,
    prevBoundIsDifferent,
    prevHeaderState,
    selectedBound,
    stateOpacityAnim,
    topNameScaleYAnim,
  ]);

  const fadeOut = useCallback((): void => {
    if (!selectedBound) {
      return;
    }

    nameFadeAnim.value = 0;
    topNameScaleYAnim.value = 1;
    stateOpacityAnim.value = 1;
    boundOpacityAnim.value = 1;
    bottomNameScaleYAnim.value = 0;
  }, [
    selectedBound,
    nameFadeAnim,
    topNameScaleYAnim,
    stateOpacityAnim,
    boundOpacityAnim,
    bottomNameScaleYAnim,
  ]);

  const prevIsJapaneseState = useLazyPrevious(isJapaneseState, fadeOutFinished);

  const fade = useCallback(() => {
    fadeOut();
    fadeIn();
  }, [fadeIn, fadeOut]);

  useEffect(() => {
    if (!selectedBound) {
      setFadeOutFinished(true);
    } else {
      setFadeOutFinished(false);
    }
    fade();
  }, [fade, selectedBound]);

  const stateTopAnimatedStyles = useAnimatedStyle(() => ({
    opacity: 1 - stateOpacityAnim.get(),
  }));

  const stateBottomAnimatedStyles = useAnimatedStyle(() => ({
    opacity: stateOpacityAnim.get(),
  }));

  const topNameAnimatedAnchorStyle = useAnimatedStyle(() => {
    const transform = {
      transform: [
        {
          scaleY: interpolate(topNameScaleYAnim.get(), [0, 1], [1, 0]),
        },
      ],
    };

    return transform;
  });

  const bottomNameAnimatedAnchorStyle = useAnimatedStyle(() => {
    const transform = {
      transform: [
        {
          scaleY: topNameScaleYAnim.get(),
        },
      ],
    };
    return transform;
  });

  const topNameAnimatedStyles = useAnimatedStyle(() => {
    return {
      opacity: nameFadeAnim.get(),
    };
  });

  const bottomNameAnimatedStyles = useAnimatedStyle(() => {
    return {
      opacity: interpolate(nameFadeAnim.get(), [0, 1], [1, 0]),
    };
  });

  const boundTopAnimatedStyles = useAnimatedStyle(() => ({
    opacity: 1 - boundOpacityAnim.get(),
  }));

  const boundBottomAnimatedStyles = useAnimatedStyle(() => ({
    opacity: boundOpacityAnim.get(),
  }));

  const [currentStationNumber, threeLetterCode] = useNumbering();
  const lineColor = useMemo(() => currentLine?.color, [currentLine]);
  const numberingColor = useMemo(
    () =>
      getNumberingColor(
        arrived,
        currentStationNumber,
        nextStation,
        currentLine
      ),
    [arrived, currentStationNumber, currentLine, nextStation]
  );

  return (
    <View>
      <HeaderBar height={15} lineColor={lineColor || '#00ac9a'} />
      <View style={{ backgroundColor: 'white', height: 2, opacity: 0.5 }} />
      <LinearGradient
        colors={['#aaa', '#fcfcfc']}
        locations={[0, 0.2]}
        style={styles.gradientRoot}
      >
        <View style={styles.headerTexts}>
          <TrainTypeBox
            lineColor={lineColor || '#00ac9a'}
            trainType={trainType}
          />
          <View style={styles.boundWrapper}>
            <Animated.Text
              style={[boundTopAnimatedStyles, styles.boundTextContainer]}
            >
              <Text style={styles.connectedLines}>
                {connectedLines?.length && isJapaneseState
                  ? `${connectionText}直通 `
                  : null}
              </Text>
              <Text style={styles.boundText}>{boundText}</Text>
            </Animated.Text>

            <Animated.Text
              style={[boundBottomAnimatedStyles, styles.boundTextContainer]}
            >
              <Text style={styles.connectedLines}>
                {connectedLines?.length && prevIsJapaneseState
                  ? `${prevConnectionText}直通 `
                  : null}
              </Text>
              <Text style={styles.boundText}>{prevBoundText}</Text>
            </Animated.Text>
          </View>
        </View>
        <View style={styles.bottom}>
          <View style={styles.stateWrapper}>
            <Animated.Text style={[stateTopAnimatedStyles, styles.state]}>
              {stateText}
            </Animated.Text>
            <Animated.Text style={[stateBottomAnimatedStyles, styles.state]}>
              {prevStateText}
            </Animated.Text>
          </View>

          {currentStationNumber ? (
            <NumberingIcon
              shape={currentStationNumber.lineSymbolShape}
              lineColor={numberingColor}
              stationNumber={currentStationNumber.stationNumber}
              threeLetterCode={threeLetterCode}
              allowScaling
            />
          ) : null}
          <View style={styles.stationNameWrapper}>
            <View style={styles.stationNameContainer}>
              <Animated.Text
                adjustsFontSizeToFit
                numberOfLines={1}
                style={[
                  topNameAnimatedStyles,
                  styles.stationName,
                  topNameAnimatedAnchorStyle,
                  {
                    fontSize: STATION_NAME_FONT_SIZE,
                    transformOrigin: 'top',
                  },
                ]}
              >
                {stationText}
              </Animated.Text>
            </View>

            <View style={styles.stationNameContainer}>
              <Animated.Text
                adjustsFontSizeToFit
                numberOfLines={1}
                style={[
                  bottomNameAnimatedStyles,
                  styles.stationName,
                  bottomNameAnimatedAnchorStyle,
                  {
                    fontSize: STATION_NAME_FONT_SIZE,
                    transformOrigin: 'bottom',
                  },
                ]}
              >
                {prevStationText}
              </Animated.Text>
            </View>
          </View>
        </View>
        <Clock
          bold
          style={{ ...styles.clockOverride, right: 8 + safeAreaRight }}
        />
      </LinearGradient>
      <HeaderBar height={5} lineColor={lineColor || '#00ac9a'} />
    </View>
  );
};

export default React.memo(HeaderSaikyo);

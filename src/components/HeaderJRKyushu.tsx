import { LinearGradient } from 'expo-linear-gradient';
import { useAtomValue } from 'jotai';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { parenthesisRegexp, STATION_NAME_FONT_SIZE } from '../constants';
import {
  useBoundText,
  useConnectedLines,
  useCurrentLine,
  useCurrentStation,
  useCurrentTrainType,
  useFirstStop,
  useIsNextLastStop,
  useLazyPrevious,
  useNextStation,
  useNumbering,
  usePrevious,
} from '../hooks';
import type { HeaderLangState } from '../models/HeaderTransitionState';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import tuningState from '../store/atoms/tuning';
import { translate } from '../translation';
import isTablet from '../utils/isTablet';
import katakanaToHiragana from '../utils/kanaToHiragana';
import { getNumberingColor } from '../utils/numbering';
import { RFValue } from '../utils/rfValue';
import NumberingIcon from './NumberingIcon';
import TrainTypeBoxJRKyushu from './TrainTypeBoxJRKyushu';

const styles = StyleSheet.create({
  root: {
    shadowColor: '#333',
    shadowOpacity: 0.25,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowRadius: 1,
    paddingBottom: 4,
    zIndex: 9999,
  },
  gradientRoot: {
    paddingTop: 14,
    paddingRight: 21,
    paddingLeft: 21,
    overflow: 'hidden',
  },
  bottom: {
    height: isTablet ? 128 : 84,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  boundWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginLeft: 8,
  },
  connectedLines: {
    color: '#555',
    fontSize: RFValue(14),
    fontWeight: 'bold',
  },
  boundTextContainer: {
    position: 'absolute',
  },
  boundText: {
    color: '#555',
    fontWeight: 'bold',
    fontSize: RFValue(18),
  },
  firstTextWrapper: {
    width: '14%',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    marginRight: 12,
    marginBottom: isTablet ? 8 : 4,
  },
  rightPad: {
    width: '10%',
  },
  firstText: {
    position: 'absolute',
    fontSize: RFValue(24),
    fontWeight: 'bold',
    textAlign: 'right',
  },
  stateWrapper: {
    width: '14%',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    marginRight: 12,
    marginBottom: isTablet ? 8 : 4,
  },
  state: {
    position: 'absolute',
    fontSize: RFValue(18),
    fontWeight: 'bold',
    textAlign: 'right',
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
  },
  divider: {
    width: '100%',
    alignSelf: 'stretch',
    height: isTablet ? 6 : 4,
    elevation: 2,
    backgroundColor: '#E50012',
  },
  headerTexts: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  numberingIconContainer: {
    alignSelf: 'center',
  },
});

const HeaderJRKyushu: React.FC = () => {
  const { selectedBound, arrived } = useAtomValue(stationState);
  const { headerState } = useAtomValue(navigationState);
  const { headerTransitionDelay } = useAtomValue(tuningState);

  const currentStation = useCurrentStation();
  const currentLine = useCurrentLine();

  const [fadeOutFinished, setFadeOutFinished] = useState(false);
  const trainType = useCurrentTrainType();
  const boundStationNameList = useBoundText();

  const connectedLines = useConnectedLines();

  const firstStop = useFirstStop();

  const connectionText = useMemo(
    () =>
      connectedLines
        ?.map((l) => l.nameShort?.replace(parenthesisRegexp, ''))
        .slice(0, 2)
        .join('・'),
    [connectedLines]
  );

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

  const isLast = useIsNextLastStop();
  const nextStation = useNextStation();

  const stationText = useMemo<string>(() => {
    if (!selectedBound) {
      return currentStation?.name ?? '';
    }

    if (firstStop) {
      switch (headerLangState) {
        case 'JA':
          return selectedBound.name ?? '';
        case 'KANA':
          return katakanaToHiragana(selectedBound.nameKatakana ?? '');
        case 'EN':
          return selectedBound.nameRoman ?? '';
        case 'ZH':
          return selectedBound.nameChinese ?? '';
        case 'KO':
          return selectedBound.nameKorean ?? '';
        default:
      }
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
    firstStop,
    headerLangState,
  ]);

  const stateTextLeft = useMemo<string>(() => {
    if (firstStop && selectedBound) {
      switch (headerLangState) {
        case 'EN':
          return 'For';
        case 'ZH':
          return '开往';
        default:
          return '';
      }
    }

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
  }, [headerState, isLast, selectedBound, firstStop, headerLangState]);

  const stateTextRight = useMemo<string>(() => {
    if (firstStop && selectedBound) {
      switch (headerLangState) {
        case 'JA':
        case 'KANA':
          return 'ゆき';
        case 'KO':
          return '행';
        default:
          return '';
      }
    }
    return '';
  }, [firstStop, selectedBound, headerLangState]);

  const prevHeaderState = useLazyPrevious(headerState, fadeOutFinished);

  const prevStationText = usePrevious(stationText);
  const prevStateTextLeft = usePrevious(stateTextLeft);
  const prevStateTextRight = usePrevious(stateTextRight);
  const prevBoundText = usePrevious(boundText);
  const prevConnectionText = usePrevious(connectionText);

  const nameFadeAnim = useSharedValue<number>(1);
  const topNameScaleYAnim = useSharedValue<number>(0);
  const stateOpacityAnim = useSharedValue<number>(0);
  const boundOpacityAnim = useSharedValue<number>(0);
  const bottomNameScaleYAnim = useSharedValue<number>(1);

  const prevBoundIsDifferent = useMemo(
    () => prevBoundText !== boundText,
    [boundText, prevBoundText]
  );

  const fadeIn = useCallback((): void => {
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

  const isJapaneseState = useMemo(
    () => headerLangState === 'JA' || headerLangState === 'KANA',
    [headerLangState]
  );

  const prevIsJapaneseState = useLazyPrevious(isJapaneseState, fadeOutFinished);

  const fade = useCallback(() => {
    fadeOut();
    fadeIn();
  }, [fadeIn, fadeOut]);

  useEffect(() => {
    setFadeOutFinished(!selectedBound);
    fade();
  }, [fade, selectedBound]);

  const stateTopAnimatedStyles = useAnimatedStyle(() => ({
    opacity: 1 - stateOpacityAnim.value,
  }));

  const stateBottomAnimatedStyles = useAnimatedStyle(() => ({
    opacity: stateOpacityAnim.value,
  }));

  const topNameAnimatedAnchorStyle = useAnimatedStyle(() => {
    const transform = {
      transform: [
        {
          scaleY: 1 - topNameScaleYAnim.value,
        },
      ],
    };

    return transform;
  });

  const bottomNameAnimatedAnchorStyle = useAnimatedStyle(() => {
    const transform = {
      transform: [
        {
          scaleY: topNameScaleYAnim.value,
        },
      ],
    };

    return transform;
  });

  const topNameAnimatedStyles = useAnimatedStyle(() => {
    return {
      opacity: nameFadeAnim.value,
    };
  });

  const bottomNameAnimatedStyles = useAnimatedStyle(() => {
    return {
      opacity: 1 - nameFadeAnim.value,
    };
  });

  const boundTopAnimatedStyles = useAnimatedStyle(() => ({
    opacity: 1 - boundOpacityAnim.value,
  }));

  const boundBottomAnimatedStyles = useAnimatedStyle(() => ({
    opacity: boundOpacityAnim.value,
  }));

  const [currentStationNumber, threeLetterCode] = useNumbering(
    false,
    firstStop
  );

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
    <View style={styles.root}>
      <LinearGradient
        colors={['#fcfcfc', '#ccc']}
        locations={[0, 1]}
        style={styles.gradientRoot}
      >
        <View style={styles.headerTexts}>
          <TrainTypeBoxJRKyushu trainType={trainType} />
          {selectedBound && !firstStop ? (
            <View style={styles.boundWrapper}>
              <Animated.Text
                style={[boundTopAnimatedStyles, styles.boundTextContainer]}
              >
                <Text
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  style={styles.connectedLines}
                >
                  {connectedLines?.length && isJapaneseState
                    ? `${connectionText}直通 `
                    : null}
                </Text>
                <Text style={styles.boundText}>{boundText}</Text>
              </Animated.Text>
              <Animated.Text
                style={[boundBottomAnimatedStyles, styles.boundTextContainer]}
              >
                <Text
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  style={styles.connectedLines}
                >
                  {connectedLines?.length && prevIsJapaneseState
                    ? `${prevConnectionText}直通 `
                    : null}
                </Text>
                <Text style={styles.boundText}>{prevBoundText}</Text>
              </Animated.Text>
            </View>
          ) : null}
        </View>
        <View style={styles.bottom}>
          <View style={styles.stateWrapper}>
            <Animated.Text
              style={[
                stateTopAnimatedStyles,
                selectedBound && firstStop ? styles.firstText : styles.state,
              ]}
            >
              {stateTextLeft}
            </Animated.Text>
            <Animated.Text
              style={[
                stateBottomAnimatedStyles,
                selectedBound && firstStop ? styles.firstText : styles.state,
              ]}
            >
              {prevStateTextLeft}
            </Animated.Text>
          </View>

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

          {currentStationNumber ? (
            <View style={styles.numberingIconContainer}>
              <NumberingIcon
                shape={currentStationNumber.lineSymbolShape || ''}
                lineColor={numberingColor}
                stationNumber={currentStationNumber.stationNumber || ''}
                threeLetterCode={threeLetterCode}
                transformOrigin="top"
                allowScaling
              />
            </View>
          ) : null}

          {selectedBound && firstStop ? (
            <View style={styles.firstTextWrapper}>
              <Animated.Text style={[stateTopAnimatedStyles, styles.firstText]}>
                {stateTextRight}
              </Animated.Text>
              <Animated.Text
                style={[stateBottomAnimatedStyles, styles.firstText]}
              >
                {prevStateTextRight}
              </Animated.Text>
            </View>
          ) : (
            <View style={styles.rightPad} />
          )}
        </View>
      </LinearGradient>
      <View style={styles.divider} />
    </View>
  );
};

export default React.memo(HeaderJRKyushu);

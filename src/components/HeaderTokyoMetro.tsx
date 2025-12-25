import { LinearGradient } from 'expo-linear-gradient';
import { useAtomValue } from 'jotai';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  MARK_SHAPE,
  parenthesisRegexp,
  STATION_NAME_FONT_SIZE,
} from '../constants';
import {
  useBoundText,
  useConnectedLines,
  useCurrentLine,
  useCurrentStation,
  useCurrentTrainType,
  useFirstStop,
  useHeaderLangState,
  useHeaderStateText,
  useHeaderStationText,
  useIsNextLastStop,
  useLazyPrevious,
  useNextStation,
  useNumbering,
  usePrevious,
} from '../hooks';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import tuningState from '../store/atoms/tuning';
import isTablet from '../utils/isTablet';
import { getNumberingColor } from '../utils/numbering';
import { RFValue } from '../utils/rfValue';
import NumberingIcon from './NumberingIcon';
import TrainTypeBox from './TrainTypeBox';

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
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    marginRight: 12,
    marginBottom: isTablet ? 8 : 4,
  },
  firstText: {
    position: 'absolute',
    fontSize: RFValue(24),
    fontWeight: 'bold',
    textAlign: 'right',
  },
  stateWrapper: {
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
  },
  headerTexts: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

const HeaderTokyoMetro: React.FC = () => {
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

  const headerLangState = useHeaderLangState();
  const boundText = useMemo(
    () => boundStationNameList[headerLangState],
    [boundStationNameList, headerLangState]
  );

  const isLast = useIsNextLastStop();
  const nextStation = useNextStation();

  const stationText = useHeaderStationText({
    currentStation,
    nextStation,
    headerLangState,
    firstStop,
  });

  const { stateText: stateTextLeft, stateTextRight } = useHeaderStateText({
    isLast,
    headerLangState,
    firstStop,
  });

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

  const dim = useWindowDimensions();

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#fcfcfc', '#fcfcfc', '#eee', '#fcfcfc', '#fcfcfc']}
        locations={[0, 0.45, 0.5, 0.6, 0.6]}
        style={styles.gradientRoot}
      >
        <View style={styles.headerTexts}>
          <TrainTypeBox trainType={trainType} />
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
          <View style={[styles.stateWrapper, { width: dim.width * 0.14 }]}>
            <Animated.Text
              style={[
                stateTopAnimatedStyles,
                selectedBound && firstStop ? styles.firstText : styles.state,
              ]}
              adjustsFontSizeToFit
              numberOfLines={2}
            >
              {stateTextLeft}
            </Animated.Text>
            <Animated.Text
              style={[
                stateBottomAnimatedStyles,
                selectedBound && firstStop ? styles.firstText : styles.state,
              ]}
              adjustsFontSizeToFit
              numberOfLines={2}
            >
              {prevStateTextLeft}
            </Animated.Text>
          </View>

          {currentStationNumber?.lineSymbolShape &&
          currentStationNumber?.stationNumber ? (
            <View
              style={{
                bottom:
                  currentStationNumber.lineSymbolShape === MARK_SHAPE.ROUND
                    ? -8
                    : 0,
              }}
            >
              <NumberingIcon
                shape={currentStationNumber.lineSymbolShape}
                lineColor={numberingColor}
                stationNumber={currentStationNumber.stationNumber}
                threeLetterCode={threeLetterCode}
                allowScaling
                transformOrigin={Platform.OS === 'ios' ? 'center' : undefined}
              />
            </View>
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

          {selectedBound && firstStop ? (
            <View
              style={[styles.firstTextWrapper, { width: dim.width * 0.14 }]}
            >
              <Animated.Text style={[stateTopAnimatedStyles, styles.firstText]}>
                {stateTextRight}
              </Animated.Text>
              <Animated.Text
                style={[stateBottomAnimatedStyles, styles.firstText]}
              >
                {prevStateTextRight}
              </Animated.Text>
            </View>
          ) : null}
        </View>
      </LinearGradient>
      <View
        style={[
          styles.divider,
          {
            backgroundColor: currentLine?.color ?? '#b5b5ac',
          },
        ]}
      />
    </View>
  );
};

export default React.memo(HeaderTokyoMetro);

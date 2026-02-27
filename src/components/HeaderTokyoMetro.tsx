import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Easing,
  Platform,
  Animated as RNAnimated,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { MARK_SHAPE, STATION_NAME_FONT_SIZE } from '../constants';
import isTablet from '../utils/isTablet';
import { RFValue } from '../utils/rfValue';
import type { CommonHeaderProps } from './Header.types';
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

const isJapaneseHeaderState = (state: string): boolean =>
  state === 'JA' || state === 'KANA';

const parseHeaderState = (state: string): { stoppingState: string; lang: string } => {
  const [stoppingState, lang] = state.split('_');
  return { stoppingState, lang: lang ?? 'JA' };
};

const HeaderTokyoMetro: React.FC<CommonHeaderProps> = (props) => {
  const {
    currentLine,
    selectedBound,
    headerState,
    headerTransitionDelay,
    stationText,
    stateText,
    stateTextRight,
    boundText,
    currentStationNumber,
    threeLetterCode,
    numberingColor,
    trainType,
    firstStop,
    connectedLines,
    connectionText,
    isJapaneseState,
  } = props;

  const progress = useRef(new RNAnimated.Value(1)).current;
  const [previousTexts, setPreviousTexts] = useState(() => ({
    headerState,
    stationText,
    stateText,
    stateTextRight,
    boundText,
    connectionText,
    isJapaneseState,
  }));

  useEffect(() => {
    const previousHeaderState = parseHeaderState(previousTexts.headerState);
    const currentHeaderState = parseHeaderState(headerState);
    const shouldSkipFadeForJapaneseToggle =
      previousTexts.headerState !== headerState &&
      previousHeaderState.stoppingState === currentHeaderState.stoppingState &&
      isJapaneseHeaderState(previousHeaderState.lang) &&
      isJapaneseHeaderState(currentHeaderState.lang);

    if (shouldSkipFadeForJapaneseToggle) {
      progress.stopAnimation();
      progress.setValue(1);
      setPreviousTexts({
        headerState,
        stationText,
        stateText,
        stateTextRight,
        boundText,
        connectionText,
        isJapaneseState,
      });
      return;
    }

    const hasChange =
      previousTexts.headerState !== headerState ||
      previousTexts.stationText !== stationText ||
      previousTexts.stateText !== stateText ||
      previousTexts.stateTextRight !== stateTextRight ||
      previousTexts.boundText !== boundText ||
      previousTexts.connectionText !== connectionText ||
      previousTexts.isJapaneseState !== isJapaneseState;
    if (!hasChange) {
      return;
    }

    progress.stopAnimation();
    progress.setValue(0);
    RNAnimated.timing(progress, {
      toValue: 1,
      duration: headerTransitionDelay,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) {
        return;
      }
      setPreviousTexts({
        headerState,
        stationText,
        stateText,
        stateTextRight,
        boundText,
        connectionText,
        isJapaneseState,
      });
    });
  }, [
    boundText,
    connectionText,
    headerState,
    headerTransitionDelay,
    isJapaneseState,
    previousTexts,
    progress,
    stateText,
    stateTextRight,
    stationText,
  ]);

  const currentOpacity = useMemo(() => progress, [progress]);
  const previousOpacity = useMemo(
    () =>
      progress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
      }),
    [progress]
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
              <RNAnimated.Text
                style={[styles.boundTextContainer, { opacity: currentOpacity }]}
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
              </RNAnimated.Text>
              <RNAnimated.Text
                style={[
                  styles.boundTextContainer,
                  { opacity: previousOpacity },
                ]}
              >
                <Text
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  style={styles.connectedLines}
                >
                  {connectedLines?.length && previousTexts.isJapaneseState
                    ? `${previousTexts.connectionText}直通 `
                    : null}
                </Text>
                <Text style={styles.boundText}>{previousTexts.boundText}</Text>
              </RNAnimated.Text>
            </View>
          ) : null}
        </View>
        <View style={styles.bottom}>
          <View style={[styles.stateWrapper, { width: dim.width * 0.14 }]}>
            <RNAnimated.Text
              style={[
                selectedBound && firstStop ? styles.firstText : styles.state,
                { opacity: currentOpacity },
              ]}
              adjustsFontSizeToFit
              numberOfLines={2}
            >
              {stateText}
            </RNAnimated.Text>
            <RNAnimated.Text
              style={[
                selectedBound && firstStop ? styles.firstText : styles.state,
                { opacity: previousOpacity },
              ]}
              adjustsFontSizeToFit
              numberOfLines={2}
            >
              {previousTexts.stateText}
            </RNAnimated.Text>
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
              <RNAnimated.Text
                adjustsFontSizeToFit
                numberOfLines={1}
                style={[
                  styles.stationName,
                  {
                    opacity: currentOpacity,
                  },
                  {
                    transformOrigin: 'top',
                    transform: [
                      {
                        scaleY: progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 1],
                          extrapolate: 'clamp',
                        }),
                      },
                    ],
                  },
                  {
                    fontSize: STATION_NAME_FONT_SIZE,
                  },
                ]}
              >
                {stationText}
              </RNAnimated.Text>
            </View>
            <View style={styles.stationNameContainer}>
              <RNAnimated.Text
                adjustsFontSizeToFit
                numberOfLines={1}
                style={[
                  styles.stationName,
                  {
                    opacity: previousOpacity,
                  },
                  {
                    transformOrigin: 'bottom',
                    transform: [
                      {
                        scaleY: progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 0],
                          extrapolate: 'clamp',
                        }),
                      },
                    ],
                  },
                  {
                    fontSize: STATION_NAME_FONT_SIZE,
                  },
                ]}
              >
                {previousTexts.stationText}
              </RNAnimated.Text>
            </View>
          </View>

          {selectedBound && firstStop ? (
            <View
              style={[styles.firstTextWrapper, { width: dim.width * 0.14 }]}
            >
              <RNAnimated.Text
                style={[styles.firstText, { opacity: currentOpacity }]}
              >
                {stateTextRight}
              </RNAnimated.Text>
              <RNAnimated.Text
                style={[styles.firstText, { opacity: previousOpacity }]}
              >
                {previousTexts.stateTextRight}
              </RNAnimated.Text>
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

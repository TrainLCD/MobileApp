import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { MARK_SHAPE, STATION_NAME_FONT_SIZE } from '../constants';
import { useHeaderAnimation } from '../hooks';
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

  const animation = useHeaderAnimation({
    selectedBound,
    headerState,
    headerTransitionDelay,
    stationText,
    stateText,
    stateTextRight,
    boundText,
    connectionText,
    isJapaneseState,
  });

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
                style={[
                  animation.boundTopAnimatedStyles,
                  styles.boundTextContainer,
                ]}
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
                style={[
                  animation.boundBottomAnimatedStyles,
                  styles.boundTextContainer,
                ]}
              >
                <Text
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  style={styles.connectedLines}
                >
                  {connectedLines?.length && animation.prevIsJapaneseState
                    ? `${animation.prevConnectionText}直通 `
                    : null}
                </Text>
                <Text style={styles.boundText}>{animation.prevBoundText}</Text>
              </Animated.Text>
            </View>
          ) : null}
        </View>
        <View style={styles.bottom}>
          <View style={[styles.stateWrapper, { width: dim.width * 0.14 }]}>
            <Animated.Text
              style={[
                animation.stateTopAnimatedStyles,
                selectedBound && firstStop ? styles.firstText : styles.state,
              ]}
              adjustsFontSizeToFit
              numberOfLines={2}
            >
              {stateText}
            </Animated.Text>
            <Animated.Text
              style={[
                animation.stateBottomAnimatedStyles,
                selectedBound && firstStop ? styles.firstText : styles.state,
              ]}
              adjustsFontSizeToFit
              numberOfLines={2}
            >
              {animation.prevStateText}
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
                  animation.topNameAnimatedStyles,
                  styles.stationName,
                  animation.topNameAnimatedAnchorStyle,
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
                  animation.bottomNameAnimatedStyles,
                  styles.stationName,
                  animation.bottomNameAnimatedAnchorStyle,
                  {
                    fontSize: STATION_NAME_FONT_SIZE,
                    transformOrigin: 'bottom',
                  },
                ]}
              >
                {animation.prevStationText}
              </Animated.Text>
            </View>
          </View>

          {selectedBound && firstStop ? (
            <View
              style={[styles.firstTextWrapper, { width: dim.width * 0.14 }]}
            >
              <Animated.Text
                style={[animation.stateTopAnimatedStyles, styles.firstText]}
              >
                {stateTextRight}
              </Animated.Text>
              <Animated.Text
                style={[animation.stateBottomAnimatedStyles, styles.firstText]}
              >
                {animation.prevStateTextRight}
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

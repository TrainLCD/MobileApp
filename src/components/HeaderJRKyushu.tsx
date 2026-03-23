import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Animated as RNAnimated, StyleSheet, Text, View } from 'react-native';
import { STATION_NAME_FONT_SIZE } from '../constants';
import { useHeaderAnimation } from '../hooks';
import isTablet from '../utils/isTablet';
import { RFValue } from '../utils/rfValue';
import type { CommonHeaderProps } from './Header.types';
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

const HeaderJRKyushu: React.FC<CommonHeaderProps> = (props) => {
  const {
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
              <RNAnimated.Text
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
              </RNAnimated.Text>
              <RNAnimated.Text
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
              </RNAnimated.Text>
            </View>
          ) : null}
        </View>
        <View style={styles.bottom}>
          <View style={styles.stateWrapper}>
            <RNAnimated.Text
              style={[
                animation.stateTopAnimatedStyles,
                selectedBound && firstStop ? styles.firstText : styles.state,
              ]}
            >
              {stateText}
            </RNAnimated.Text>
            <RNAnimated.Text
              style={[
                animation.stateBottomAnimatedStyles,
                selectedBound && firstStop ? styles.firstText : styles.state,
              ]}
            >
              {animation.prevStateText}
            </RNAnimated.Text>
          </View>

          <View style={styles.stationNameWrapper}>
            <View style={styles.stationNameContainer}>
              <RNAnimated.Text
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
              </RNAnimated.Text>
            </View>
            <View style={styles.stationNameContainer}>
              <RNAnimated.Text
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
              </RNAnimated.Text>
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
              <RNAnimated.Text
                style={[
                  animation.stateTopAnimatedStylesRight,
                  styles.firstText,
                ]}
              >
                {stateTextRight}
              </RNAnimated.Text>
              <RNAnimated.Text
                style={[
                  animation.stateBottomAnimatedStylesRight,
                  styles.firstText,
                ]}
              >
                {animation.prevStateTextRight}
              </RNAnimated.Text>
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

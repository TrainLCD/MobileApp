import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  Platform,
  Animated as RNAnimated,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { STATION_NAME_FONT_SIZE } from '../constants';
import { useHeaderAnimation } from '../hooks';
import isTablet from '../utils/isTablet';
import { RFValue } from '../utils/rfValue';
import Clock from './Clock';
import type { CommonHeaderProps } from './Header.types';
import NumberingIcon from './NumberingIcon';
import TrainTypeBox from './TrainTypeBoxSaikyo';

const styles = StyleSheet.create({
  topBar: {
    backgroundColor: 'white',
    height: 2,
    opacity: 0.5,
  },
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

const HeaderSaikyo: React.FC<CommonHeaderProps> = (props) => {
  const {
    currentLine,
    selectedBound,
    headerState,
    headerTransitionDelay,
    stationText,
    stateText,
    boundText,
    currentStationNumber,
    threeLetterCode,
    numberingColor,
    trainType,
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
    stateTextRight: '',
    boundText,
    connectionText,
    isJapaneseState,
  });

  const { right: safeAreaRight } = useSafeAreaInsets();
  const lineColor = currentLine?.color ?? '#00ac9a';

  return (
    <View>
      <HeaderBar height={15} lineColor={lineColor} />
      <View style={styles.topBar} />
      <LinearGradient
        colors={['#aaa', '#fcfcfc']}
        locations={[0, 0.2]}
        style={styles.gradientRoot}
      >
        <View style={styles.headerTexts}>
          <TrainTypeBox lineColor={lineColor} trainType={trainType} />
          <View style={styles.boundWrapper}>
            <RNAnimated.Text
              style={[
                animation.boundTopAnimatedStyles,
                styles.boundTextContainer,
              ]}
            >
              <Text style={styles.connectedLines}>
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
              <Text style={styles.connectedLines}>
                {connectedLines?.length && animation.prevIsJapaneseState
                  ? `${animation.prevConnectionText}直通 `
                  : null}
              </Text>
              <Text style={styles.boundText}>{animation.prevBoundText}</Text>
            </RNAnimated.Text>
          </View>
        </View>
        <View style={styles.bottom}>
          <View style={styles.stateWrapper}>
            <RNAnimated.Text
              style={[animation.stateTopAnimatedStyles, styles.state]}
              adjustsFontSizeToFit
              numberOfLines={2}
            >
              {stateText}
            </RNAnimated.Text>
            <RNAnimated.Text
              style={[animation.stateBottomAnimatedStyles, styles.state]}
              adjustsFontSizeToFit
              numberOfLines={2}
            >
              {animation.prevStateText}
            </RNAnimated.Text>
          </View>

          {currentStationNumber ? (
            <NumberingIcon
              shape={currentStationNumber.lineSymbolShape || ''}
              lineColor={numberingColor}
              stationNumber={currentStationNumber.stationNumber || ''}
              threeLetterCode={threeLetterCode}
              allowScaling
              transformOrigin="bottom"
            />
          ) : null}
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
        </View>
        <Clock
          bold
          style={[
            styles.clockOverride,
            {
              right: 8 + safeAreaRight,
            },
          ]}
        />
      </LinearGradient>
      <HeaderBar height={5} lineColor={lineColor} />
    </View>
  );
};

export default React.memo(HeaderSaikyo);

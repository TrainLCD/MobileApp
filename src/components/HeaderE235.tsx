import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { STATION_NAME_FONT_SIZE } from '../constants';
import { useLoopLine } from '../hooks';
import isTablet from '../utils/isTablet';
import { RFValue } from '../utils/rfValue';
import Clock from './Clock';
import type { HeaderE235Props } from './Header.types';
import NumberingIcon from './NumberingIcon';
import TrainTypeBoxJO from './TrainTypeBoxJO';
import Typography from './Typography';

const styles = StyleSheet.create({
  gradientRoot: {
    paddingLeft: 24,
    overflow: 'hidden',
    height: isTablet ? 200 : 128,
    flexDirection: 'row',
  },
  boundContainer: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  bound: {
    color: '#fff',
    fontWeight: 'bold',
    width: '100%',
  },
  boundGrayText: {
    color: '#aaa',
    fontWeight: 'bold',
  },
  boundSuffix: {
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'right',
  },
  stationName: {
    fontWeight: 'bold',
    color: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
    textAlign: 'center',
    fontSize: STATION_NAME_FONT_SIZE,
  },
  left: {
    flex: 0.3,
    justifyContent: 'center',
    height: isTablet ? 200 : 128,
    marginRight: 24,
    position: 'relative',
  },
  right: {
    flex: 1,
    position: 'relative',
    justifyContent: 'flex-end',
    height: isTablet ? 200 : 128,
  },
  state: {
    position: 'absolute',
    top: isTablet ? 24 : 12,
    color: '#fff',
    fontWeight: 'bold',
    fontSize: RFValue(21),
  },
  colorBar: {
    width: isTablet ? 48 : 38,
    height: isTablet ? 190 : 120,
    marginRight: 16,
  },
  clockOverride: {
    position: 'absolute',
    top: 8,
    right: '25%',
  },
  stationNameContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
});

const HeaderE235: React.FC<HeaderE235Props> = (props) => {
  const {
    currentLine,
    selectedBound,
    headerLangState,
    stationText,
    stateText,
    boundText,
    currentStationNumber,
    threeLetterCode,
    numberingColor,
    trainType,
    isJO,
  } = props;

  const { isLoopLine, isPartiallyLoopLine } = useLoopLine();

  const boundPrefix = useMemo(() => {
    switch (headerLangState) {
      case 'EN':
        return isLoopLine ? 'Bound for' : 'for';
      case 'ZH':
        return '开往';
      default:
        return '';
    }
  }, [headerLangState, isLoopLine]);

  const boundSuffix = useMemo(() => {
    switch (headerLangState) {
      case 'EN':
        return '';
      case 'ZH':
        return '';
      case 'KO':
        return isLoopLine || isPartiallyLoopLine ? '방면' : '행';
      default:
        return isLoopLine || isPartiallyLoopLine ? '方面' : 'ゆき';
    }
  }, [headerLangState, isLoopLine, isPartiallyLoopLine]);

  const boundContainerMarginTop = useMemo(() => {
    if (!isJO) {
      return 0;
    }
    if (isTablet) {
      return 85;
    }
    return 55;
  }, [isJO]);

  const boundFontSize = useMemo(() => {
    if (isJO) {
      return RFValue(20);
    }
    return RFValue(25);
  }, [isJO]);

  return (
    <LinearGradient colors={['#222222', '#212121']} style={styles.gradientRoot}>
      <View style={styles.left}>
        {isJO ? <TrainTypeBoxJO trainType={trainType} /> : null}

        <View
          style={[
            styles.boundContainer,
            {
              marginTop: boundContainerMarginTop,
            },
          ]}
        >
          {selectedBound && boundPrefix.length ? (
            <Typography
              adjustsFontSizeToFit
              numberOfLines={1}
              style={[
                styles.boundGrayText,
                {
                  fontSize: RFValue(isJO ? 14 : 18),
                },
              ]}
            >
              {boundPrefix}
            </Typography>
          ) : null}
          <Typography
            style={[
              styles.bound,
              {
                fontSize: boundFontSize,
              },
            ]}
            adjustsFontSizeToFit
            numberOfLines={2}
            lineBreakStrategyIOS="push-out"
            textBreakStrategy="balanced"
          >
            {boundText}
          </Typography>
          {selectedBound && boundSuffix.length ? (
            <Typography
              style={[
                styles.boundSuffix,
                {
                  fontSize: RFValue(isJO ? 14 : 18),
                },
                headerLangState === 'KO' ? styles.boundGrayText : null,
              ]}
            >
              {boundSuffix}
            </Typography>
          ) : null}
        </View>
      </View>
      <View
        style={[
          styles.colorBar,
          {
            backgroundColor: currentLine
              ? (currentLine.color ?? '#000')
              : '#aaa',
          },
        ]}
      />
      <View style={styles.right}>
        <Typography style={styles.state} adjustsFontSizeToFit numberOfLines={2}>
          {stateText}
        </Typography>
        <View style={styles.stationNameContainer}>
          {currentStationNumber ? (
            <NumberingIcon
              shape={currentStationNumber.lineSymbolShape || ''}
              lineColor={numberingColor}
              stationNumber={currentStationNumber.stationNumber || ''}
              threeLetterCode={threeLetterCode}
              withDarkTheme
              allowScaling
              transformOrigin={Platform.OS === 'android' ? 'bottom' : undefined}
            />
          ) : null}
          <Typography
            style={styles.stationName}
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            {stationText}
          </Typography>
        </View>
      </View>
      <Clock white style={styles.clockOverride} />
    </LinearGradient>
  );
};

export default React.memo(HeaderE235);

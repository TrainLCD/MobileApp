import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useLoopLine } from '~/hooks';
import { STATION_NAME_FONT_SIZE } from '../constants';
import isTablet from '../utils/isTablet';
import { RFValue } from '../utils/rfValue';
import Clock from './Clock';
import type { CommonHeaderProps } from './Header.types';
import NumberingIcon from './NumberingIcon';
import TrainTypeBoxJL from './TrainTypeBoxJL';
import Typography from './Typography';

const styles = StyleSheet.create({
  gradientRoot: {
    overflow: 'hidden',
    height: isTablet ? 200 : 128,
    flexDirection: 'row',
  },
  boundContainer: {
    position: 'absolute',
    top: isTablet ? 79 : 47,
    width: '100%',
    height: '50%',
    justifyContent: 'flex-end',
  },
  bound: {
    color: '#fff',
    fontWeight: 'bold',
    width: '100%',
  },
  boundSuffix: {
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'right',
    fontSize: RFValue(14),
  },
  stationName: {
    fontWeight: 'bold',
    color: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    flexWrap: 'wrap',
    flex: 1,
    textAlign: 'center',
    fontSize: STATION_NAME_FONT_SIZE,
  },
  left: {
    flex: 0.2,
    height: isTablet ? 200 : 128,
    position: 'relative',
    flexDirection: 'row',
    paddingHorizontal: 32,
  },
  right: {
    flex: 0.8,
    paddingLeft: isTablet ? 64 : 8,
    justifyContent: 'center',
    height: isTablet ? 200 : 128,
  },
  state: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: RFValue(21),
    position: 'absolute',
    top: 12,
    paddingLeft: isTablet ? 64 : 32,
  },
  clockContainer: {
    position: 'absolute',
    top: 8,
    right: '25%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  clockLabel: {
    color: '#fff',
    fontSize: RFValue(14),
    marginRight: 4,
  },
  clockOverride: {
    backgroundColor: 'white',
  },
  stationNameContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flex: 1,
    marginBottom: 8,
    marginLeft: 32,
  },
  leftInner: {
    width: '100%',
    height: '100%',
    flexDirection: 'column',
  },
});

const HeaderJL: React.FC<CommonHeaderProps> = (props) => {
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
  } = props;

  const { isLoopLine, isPartiallyLoopLine } = useLoopLine();

  const boundPrefix = useMemo(() => {
    switch (headerLangState) {
      case 'EN':
        return 'for';
      case 'ZH':
        return '开往';
      default:
        return '';
    }
  }, [headerLangState]);

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

  const clockLabel = useMemo(() => {
    switch (headerLangState) {
      case 'EN':
        return 'Time';
      case 'ZH':
        return '时间';
      case 'KO':
        return '시간';
      default:
        return '現在時刻';
    }
  }, [headerLangState]);

  return (
    <LinearGradient colors={['#222222', '#212121']} style={styles.gradientRoot}>
      <View
        style={[
          styles.left,
          {
            backgroundColor: currentLine?.color ?? 'transparent',
          },
        ]}
      >
        <View style={styles.leftInner}>
          <TrainTypeBoxJL
            trainType={trainType}
            trainTypeColor={currentLine?.color}
          />
          <View style={styles.boundContainer}>
            {selectedBound && boundPrefix.length ? (
              <Typography
                adjustsFontSizeToFit
                numberOfLines={1}
                style={[
                  styles.bound,
                  {
                    fontSize: RFValue(14),
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
                  fontSize: RFValue(20),
                },
              ]}
              adjustsFontSizeToFit
              numberOfLines={1}
            >
              {boundText}
            </Typography>
            {selectedBound && boundSuffix.length ? (
              <Typography style={styles.boundSuffix}>{boundSuffix}</Typography>
            ) : null}
          </View>
        </View>
        <Svg
          width={isTablet ? 114 : 95}
          height="100%"
          viewBox="0 0 25 100"
          fill="none"
        >
          <Path
            d="M25 50L0 0L0 100L25 50Z"
            fill={currentLine?.color ?? 'transparent'}
          />
        </Svg>
      </View>
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
              transformOrigin="bottom"
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
      <View style={styles.clockContainer}>
        <Typography style={styles.clockLabel}>{clockLabel}</Typography>
        <Clock style={styles.clockOverride} />
      </View>
    </LinearGradient>
  );
};

export default React.memo(HeaderJL);

import React, { useCallback, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useClock, useInterval } from '../hooks';
import { translate } from '../translation';
import isTablet from '../utils/isTablet';
import { RFValue } from '../utils/rfValue';
import type { CommonHeaderProps } from './Header.types';
import NumberingIcon from './NumberingIcon';
import TrainTypeBox from './TrainTypeBoxE231';

const styles = StyleSheet.create({
  root: {
    zIndex: 9999,
    backgroundColor: '#A6A4A5',
  },
  contentRoot: {
    paddingRight: 21,
    paddingLeft: 21,
  },
  bottom: {
    height: isTablet ? 128 : 84,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: isTablet ? 4 : 2,
  },
  boundText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: RFValue(24),
  },
  boundWrapper: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 8,
  },
  boundInner: {
    width: '60%',
    alignItems: 'flex-start',
  },
  stateWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    marginRight: isTablet ? 12 : 8,
    marginBottom: isTablet ? 8 : 4,
  },
  spacer: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
  },
  state: {
    fontSize: RFValue(24),
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'right',
    lineHeight: Platform.select({ android: RFValue(21) }),
  },
  stationArea: {
    width: '60%',
    height: isTablet ? 128 : 80,
    flexShrink: 0,
    flexGrow: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: isTablet ? 4 : 2,
    borderColor: '#666',
    borderRadius: isTablet ? 4 : 2,
    paddingHorizontal: isTablet ? 8 : 4,
  },
  stationNameWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stationName: {
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1B432B',
    fontSize: RFValue(64),
  },
  headerTexts: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    height: 0,
  },
  trainTypeWrapper: {
    position: 'absolute',
    left: 0,
    top: 8,
  },
  boundSuffix: {
    fontSize: RFValue(24),
    fontWeight: 'bold',
    color: '#000',
    marginBottom: isTablet ? 8 : 4,
  },
  clockContainer: {
    position: 'absolute',
    bottom: isTablet ? 0 : 8,
    right: 16,
    alignItems: 'center',
  },
  clockBox: {
    backgroundColor: '#fff',
    paddingHorizontal: isTablet ? 8 : 4,
    paddingVertical: isTablet ? 4 : 2,
    borderRadius: isTablet ? 8 : 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  clockLabel: {
    fontSize: RFValue(14),
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 2,
  },
  clockText: {
    fontSize: RFValue(24),
    color: '#3a3a3a',
  },
  divider: {
    width: '100%',
    height: isTablet ? 4 : 2,
    backgroundColor: '#999',
  },
});

const HeaderE231: React.FC<CommonHeaderProps> = (props) => {
  const {
    stationText,
    stateText,
    headerLangState,
    boundText,
    currentStationNumber,
    threeLetterCode,
    numberingColor,
    trainType,
    firstStop,
  } = props;

  const [hours, minutes] = useClock();
  const [colonOpacity, setColonOpacity] = useState(0);
  useInterval(
    useCallback(() => setColonOpacity((prev) => (prev === 0 ? 1 : 0)), []),
    500
  );

  const boundSuffixText = useMemo(() => {
    switch (headerLangState) {
      case 'JA':
        return firstStop ? '行' : '';
      case 'KANA':
        return firstStop ? 'ゆき' : '';
      case 'KO':
        return firstStop ? '행' : '';
      default:
        return '';
    }
  }, [headerLangState, firstStop]);

  const resolvedStateText = useMemo(() => {
    if (firstStop && headerLangState !== 'EN' && headerLangState !== 'ZH') {
      return '';
    }
    if (stateText) {
      return stateText;
    }
    switch (headerLangState) {
      case 'EN':
        return translate('nowStoppingAtEn');
      case 'ZH':
        return translate('nowStoppingAtZh');
      case 'KO':
        return translate('nowStoppingAtKo');
      default:
        return translate('nowStoppingAt');
    }
  }, [firstStop, stateText, headerLangState]);

  return (
    <View style={styles.root}>
      <View style={styles.contentRoot}>
        <View style={styles.headerTexts}>
          <View style={styles.trainTypeWrapper}>
            <TrainTypeBox trainType={trainType} />
          </View>
        </View>
        <View style={styles.boundWrapper}>
          <View style={styles.spacer} />
          <View style={styles.boundInner}>
            <Text style={styles.boundText}>{firstStop ? '' : boundText}</Text>
          </View>
          <View style={styles.spacer} />
        </View>
        <View style={styles.bottom}>
          <View style={styles.stateWrapper}>
            <Text style={styles.state} adjustsFontSizeToFit numberOfLines={2}>
              {resolvedStateText}
            </Text>
          </View>

          <View style={styles.stationArea}>
            {currentStationNumber ? (
              <NumberingIcon
                shape={currentStationNumber.lineSymbolShape || ''}
                lineColor={numberingColor}
                stationNumber={currentStationNumber.stationNumber || ''}
                threeLetterCode={threeLetterCode}
                allowScaling
                transformOrigin="center"
              />
            ) : null}
            <View style={styles.stationNameWrapper}>
              <Text
                adjustsFontSizeToFit
                numberOfLines={1}
                style={styles.stationName}
              >
                {stationText}
              </Text>
            </View>
          </View>
          <View style={styles.spacer}>
            {boundSuffixText ? (
              <Text style={styles.boundSuffix}>{boundSuffixText}</Text>
            ) : null}
          </View>
        </View>
        <View style={styles.clockContainer}>
          <Text style={styles.clockLabel}>現在時刻</Text>
          <View style={styles.clockBox}>
            <Text style={styles.clockText}>{hours}</Text>
            <Text style={[styles.clockText, { opacity: colonOpacity }]}>:</Text>
            <Text style={styles.clockText}>{minutes}</Text>
          </View>
        </View>
      </View>
      <View style={styles.divider} />
    </View>
  );
};

export default React.memo(HeaderE231);

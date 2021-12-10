import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import { hasNotch } from 'react-native-device-info';
import { RFValue } from 'react-native-responsive-fontsize';
import { useRecoilValue } from 'recoil';
import { parenthesisRegexp } from '../constants/regexp';
import truncateTrainType from '../constants/truncateTrainType';
import useCurrentLine from '../hooks/useCurrentLine';
import { APITrainType } from '../models/StationAPI';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import getIsPass from '../utils/isPass';
import isTablet from '../utils/isTablet';
import { getIsLocal } from '../utils/localType';
import { heightScale, widthScale } from '../utils/scale';
import BarTerminalEast from './BarTerminalEast';

const { width: windowWidth } = Dimensions.get('window');
const barLeft = widthScale(33);
const barRightSP = hasNotch() ? widthScale(35) : widthScale(38);
const barRight = isTablet ? widthScale(32 + 4) : barRightSP;
const barRightAndroid = widthScale(35);
const barLeftWidth = widthScale(155);
const barRightWidthSP = hasNotch() ? widthScale(153) : widthScale(150);
const barRightWidth = isTablet ? widthScale(151) : barRightWidthSP;
const barRightWidthAndroid = widthScale(152);
const topFlex = isTablet ? 0.35 : 0.25;
const topFlexAndroid = 0.2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  top: {
    flex: Platform.OS === 'ios' ? topFlex : topFlexAndroid,
    padding: 32,
  },
  headingJa: {
    fontSize: isTablet ? RFValue(24) : RFValue(21),
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#212121',
  },
  headingEn: {
    fontSize: isTablet ? RFValue(16) : RFValue(12),
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#212121',
  },
  bottom: {
    flex: 1,
  },
  linesContainer: {
    position: 'relative',
    width: windowWidth,
  },
  bar: {
    position: 'absolute',
    height: isTablet ? heightScale(48) : 32,
  },
  barTerminal: {
    width: isTablet ? widthScale(49) : 33.7,
    height: isTablet ? heightScale(49) : 32,
    position: 'absolute',
  },
  centerCircle: {
    position: 'absolute',
    width: isTablet ? widthScale(16) : widthScale(12),
    height: isTablet ? widthScale(16) : widthScale(12),
    backgroundColor: 'white',
    alignSelf: 'center',
    top: heightScale(4),
    borderRadius: isTablet ? widthScale(8) : widthScale(6),
    zIndex: 9999,
  },
  trainTypeLeft: {
    width: isTablet ? 256 : 128,
    height: isTablet ? 72 : 48,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: isTablet ? heightScale(-8) : heightScale(-16),
  },
  trainTypeRight: {
    width: isTablet ? 360 : 128,
    height: isTablet ? 72 : 48,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: isTablet ? heightScale(-8) : heightScale(-16),
  },
  gradient: {
    width: isTablet ? widthScale(64) : 128,
    height: isTablet ? heightScale(64) : 48,
    position: 'absolute',
    borderRadius: 4,
  },
  textWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    shadowOpacity: 0.25,
    shadowColor: '#000',
    shadowRadius: 1,
    elevation: 5,
    fontSize: RFValue(21),
    lineHeight: RFValue(Platform.OS === 'ios' ? 21 : 21 + 4),
  },
  lineText: {
    width: isTablet ? widthScale(64) : 128,
    textAlign: 'center',
    fontWeight: 'bold',
    position: 'absolute',
  },
});

const TypeChangeNotify: React.FC = () => {
  const { trainType } = useRecoilValue(navigationState);
  const {
    selectedDirection,
    rawStations: stations,
    selectedBound,
  } = useRecoilValue(stationState);
  const typedTrainType = trainType as APITrainType;

  const currentLine = useCurrentLine();
  const currentTrainType = typedTrainType?.allTrainTypes.find(
    (tt) => tt.line.id === currentLine?.id
  );
  const nextTrainType = useMemo(() => {
    const currentTrainTypeIndex = typedTrainType?.allTrainTypes.findIndex(
      (tt) => tt.line.id === currentLine?.id
    );
    if (selectedDirection === 'INBOUND') {
      return typedTrainType?.allTrainTypes[currentTrainTypeIndex + 1];
    }
    return typedTrainType?.allTrainTypes[currentTrainTypeIndex - 1];
  }, [currentLine?.id, selectedDirection, typedTrainType?.allTrainTypes]);

  const currentLineStations = stations.filter(
    (s) => s.currentLine?.id === currentLine?.id
  );
  const currentLineLastStation = useMemo(() => {
    if (selectedDirection === 'INBOUND') {
      return currentLineStations[currentLineStations.length - 1];
    }
    return currentLineStations[0];
  }, [currentLineStations, selectedDirection]);

  const currentLineIsStopAtAllStations = !stations
    .filter((s) => s.currentLine?.id === currentLine?.id)
    .filter((s) => getIsPass(s)).length;

  const headingTexts = useMemo((): {
    jaPrefix: string;
    enPrefix: string;
    jaSuffix?: string;
    enSuffix?: string;
  } | null => {
    if (!currentLineLastStation) {
      return null;
    }

    if (getIsLocal(nextTrainType) && !currentLineIsStopAtAllStations) {
      return {
        jaPrefix: `${currentLineLastStation.name}から先は各駅にとまります`,
        enPrefix: `The train stops at all stations after ${currentLineLastStation.nameR}.`,
      };
    }

    const aOrAn = (() => {
      const first = nextTrainType.nameR[0].toLowerCase();
      switch (first) {
        case 'a':
        case 'i':
        case 'u':
        case 'e':
        case 'o':
          return 'an';
        default:
          return 'a';
      }
    })();

    if (!selectedBound) {
      return null;
    }

    return {
      jaPrefix: `${currentLineLastStation.name}から`,
      enPrefix: `From ${currentLineLastStation.nameR} station, this train become ${aOrAn}`,
      jaSuffix: `${selectedBound.name}ゆき となります`,
      enSuffix: `train bound for ${selectedBound.nameR}.`,
    };
  }, [
    currentLineIsStopAtAllStations,
    currentLineLastStation,
    nextTrainType,
    selectedBound,
  ]);

  const trainTypeLeftVal = useMemo(() => {
    if (isTablet) {
      return widthScale(barRight - 64);
    }
    if (!hasNotch()) {
      return widthScale(barRight);
    }
    return widthScale(barRight - 32);
  }, []);

  const trainTypeRightVal = useMemo(() => {
    if (isTablet) {
      return widthScale(barRight - 84);
    }
    if (!hasNotch()) {
      return widthScale(barRight);
    }
    return widthScale(barRight - 32);
  }, []);

  const lineTextTopVal = useMemo(() => {
    if (Platform.OS === 'android' && !isTablet) {
      return heightScale(90);
    }
    if (isTablet) {
      return heightScale(72);
    }
    if (!hasNotch()) {
      return heightScale(barRight + 28);
    }
    return heightScale(barRight + 8);
  }, []);

  const getBarTerminalRight = (): number => {
    if (isTablet) {
      return barRight - widthScale(32);
    }
    if (Platform.OS === 'android' && !isTablet) {
      return barRightAndroid - 30;
    }
    return barRight - 30;
  };

  const HeadingJa = () => {
    if (!headingTexts) {
      return null;
    }

    if (headingTexts.jaSuffix) {
      return (
        <Text style={styles.headingJa}>
          {`${headingTexts.jaPrefix} `}
          <Text style={{ color: nextTrainType?.color || '#212121' }}>
            {nextTrainType?.name}
          </Text>
          {` ${headingTexts.jaSuffix}`}
        </Text>
      );
    }
    return <Text style={styles.headingJa}>{headingTexts.jaPrefix}</Text>;
  };
  const HeadingEn = () => {
    if (!headingTexts) {
      return null;
    }

    if (headingTexts.enSuffix) {
      return (
        <Text style={styles.headingEn}>
          {/* eslint-disable-next-line react/jsx-one-expression-per-line */}
          {headingTexts.enPrefix}{' '}
          <Text style={{ color: nextTrainType?.color || '#212121' }}>
            {nextTrainType?.nameR}
          </Text>
          {` ${headingTexts.enSuffix}`}
        </Text>
      );
    }

    return <Text style={styles.headingEn}>{headingTexts.enPrefix}</Text>;
  };

  if (!currentTrainType) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <HeadingJa />
        <HeadingEn />
      </View>
      <View style={styles.bottom}>
        <Text style={styles.headingJa}>{currentLineLastStation?.name}</Text>
        <Text style={styles.headingEn}>{currentLineLastStation?.nameR}</Text>
        <View style={styles.linesContainer}>
          {/* Current line */}
          <LinearGradient
            colors={['#fff', '#000', '#000', '#fff']}
            locations={[0.5, 0.5, 0.5, 0.9]}
            style={{
              ...styles.bar,
              left: barLeft,
              width: barLeftWidth,
              borderTopLeftRadius: 0,
              borderBottomLeftRadius: 0,
            }}
          />
          <LinearGradient
            colors={['#aaaaaaff', '#aaaaaabb']}
            style={{
              ...styles.bar,
              left: barLeft,
              width: barLeftWidth,
            }}
          />
          <LinearGradient
            colors={['#fff', '#000', '#000', '#fff']}
            locations={[0.5, 0.5, 0.5, 0.9]}
            style={{
              ...styles.bar,
              left: barLeft,
              width: barLeftWidth,
              borderTopLeftRadius: 0,
              borderBottomLeftRadius: 0,
            }}
          />
          <LinearGradient
            colors={[
              `#${currentTrainType.line.lineColorC}ff`,
              `#${currentTrainType.line.lineColorC}bb`,
            ]}
            style={{
              ...styles.bar,
              left: barLeft,
              width: barLeftWidth,
            }}
          />

          <View style={styles.centerCircle} />
          {/* Next line */}
          <LinearGradient
            colors={['#fff', '#000', '#000', '#fff']}
            locations={[0.5, 0.5, 0.5, 0.9]}
            style={{
              ...styles.bar,
              right: Platform.OS === 'ios' ? barRight : barRightAndroid,
              width:
                Platform.OS === 'ios' ? barRightWidth : barRightWidthAndroid,
              borderTopLeftRadius: 0,
              borderBottomLeftRadius: 0,
            }}
          />
          <LinearGradient
            colors={['#aaaaaaff', '#aaaaaabb']}
            style={{
              ...styles.bar,
              right: Platform.OS === 'ios' ? barRight : barRightAndroid,
              width:
                Platform.OS === 'ios' ? barRightWidth : barRightWidthAndroid,
            }}
          />
          <LinearGradient
            colors={['#fff', '#000', '#000', '#fff']}
            locations={[0.5, 0.5, 0.5, 0.9]}
            style={{
              ...styles.bar,
              right: Platform.OS === 'ios' ? barRight : barRightAndroid,
              width:
                Platform.OS === 'ios' ? barRightWidth : barRightWidthAndroid,
              borderTopLeftRadius: 0,
              borderBottomLeftRadius: 0,
            }}
          />
          <LinearGradient
            colors={[
              `#${nextTrainType.line.lineColorC}ff`,
              `#${nextTrainType.line.lineColorC}bb`,
            ]}
            style={{
              ...styles.bar,
              right: Platform.OS === 'ios' ? barRight : barRightAndroid,
              width:
                Platform.OS === 'ios' ? barRightWidth : barRightWidthAndroid,
            }}
          />
          <BarTerminalEast
            style={[styles.barTerminal, { right: getBarTerminalRight() }]}
            lineColor={`#${nextTrainType.line.lineColorC}`}
            hasTerminus={false}
          />

          <View style={[styles.trainTypeLeft, { left: trainTypeLeftVal }]}>
            <LinearGradient
              colors={['#aaa', '#000', '#000', '#aaa']}
              locations={[0.5, 0.5, 0.5, 0.9]}
              style={styles.gradient}
            />
            <LinearGradient
              colors={[
                `${currentTrainType.color}ee`,
                `${currentTrainType.color}aa`,
              ]}
              style={styles.gradient}
            />

            <View style={styles.textWrapper}>
              <Text style={styles.text}>{currentTrainType.name}</Text>
              <Text
                style={[
                  {
                    ...styles.text,
                    fontSize: RFValue(12),
                    lineHeight: RFValue(12),
                  },
                ]}
              >
                {truncateTrainType(currentTrainType.nameR)}
              </Text>
            </View>
            <Text
              style={[
                {
                  ...styles.lineText,
                  top: lineTextTopVal,
                  color: `#${currentTrainType.line.lineColorC}`,
                  fontSize: RFValue(12),
                  lineHeight: RFValue(Platform.OS === 'ios' ? 12 : 12 + 2),
                },
              ]}
            >
              {/* eslint-disable-next-line react/jsx-one-expression-per-line */}
              {currentTrainType.line.name.replace(parenthesisRegexp, '')}{' '}
              {currentTrainType.line.nameR.replace(parenthesisRegexp, '')}
            </Text>
          </View>
          <View style={[styles.trainTypeRight, { right: trainTypeRightVal }]}>
            <LinearGradient
              colors={['#aaa', '#000', '#000', '#aaa']}
              locations={[0.5, 0.5, 0.5, 0.9]}
              style={styles.gradient}
            />
            <LinearGradient
              colors={[`${nextTrainType.color}ee`, `${nextTrainType.color}aa`]}
              style={styles.gradient}
            />

            <View style={styles.textWrapper}>
              <Text
                style={[
                  {
                    ...styles.text,
                  },
                ]}
              >
                {nextTrainType.name}
              </Text>
              <Text
                style={[
                  {
                    ...styles.text,
                    fontSize: RFValue(12),
                    lineHeight: RFValue(12),
                  },
                ]}
              >
                {truncateTrainType(nextTrainType.nameR)}
              </Text>
            </View>
            <Text
              style={[
                {
                  ...styles.lineText,
                  top: lineTextTopVal,
                  color: `#${nextTrainType.line.lineColorC}`,
                  fontSize: RFValue(12),
                  lineHeight: RFValue(Platform.OS === 'ios' ? 12 : 12 + 2),
                },
              ]}
            >
              {/* eslint-disable-next-line react/jsx-one-expression-per-line */}
              {nextTrainType.line.name.replace(parenthesisRegexp, '')}{' '}
              {nextTrainType.line.nameR.replace(parenthesisRegexp, '')}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default TypeChangeNotify;

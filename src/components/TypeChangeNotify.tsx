import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import {
  Dimensions,
  Platform,
  PlatformIOSStatic,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { hasNotch } from 'react-native-device-info';
import { RFValue } from 'react-native-responsive-fontsize';
import { useRecoilValue } from 'recoil';
import { parenthesisRegexp } from '../constants/regexp';
import truncateTrainType from '../constants/truncateTrainType';
import { APITrainType } from '../models/StationAPI';
import lineState from '../store/atoms/line';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import getCurrentLine from '../utils/currentLine';
import { getIsLocal } from '../utils/localType';
import { heightScale, widthScale } from '../utils/scale';
import BarTerminalEast from './BarTerminalEast';

const { isPad } = Platform as PlatformIOSStatic;

const { width: windowWidth } = Dimensions.get('window');
const barLeft = widthScale(33);
const barRightSP = hasNotch() ? widthScale(35) : widthScale(38);
const barRight = isPad ? widthScale(32 + 4) : barRightSP;
const barLeftWidth = isPad ? widthScale(155) : widthScale(155);
const barRightWidthSP = hasNotch() ? widthScale(153) : widthScale(150);
const barRightWidth = isPad ? widthScale(151) : barRightWidthSP;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  top: {
    flex: isPad ? 0.35 : 0.25,
    padding: 32,
  },
  headingJa: {
    fontSize: isPad ? RFValue(24) : RFValue(21),
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#212121',
  },
  headingEn: {
    fontSize: isPad ? RFValue(16) : RFValue(12),
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
    height: isPad ? 48 : 32,
  },
  barTerminal: {
    width: isPad ? widthScale(16) : 33.7,
    height: isPad ? heightScale(39) : 32,
    position: 'absolute',
    right: widthScale(21.5),
  },
  centerCircle: {
    position: 'absolute',
    width: widthScale(12),
    height: widthScale(12),
    backgroundColor: 'white',
    alignSelf: 'center',
    top: heightScale(4),
    borderRadius: isPad ? 48 : 32,
    zIndex: 9999,
  },
  trainTypeLeft: {
    width: isPad ? 256 : 128,
    height: isPad ? 72 : 48,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: isPad ? heightScale(-8) : heightScale(-16),
  },
  trainTypeRight: {
    width: isPad ? 360 : 128,
    height: isPad ? 72 : 48,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: isPad ? heightScale(-8) : heightScale(-16),
  },
  gradient: {
    width: isPad ? 175 : 128,
    height: isPad ? 72 : 48,
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
    width: widthScale(64),
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    position: 'absolute',
  },
});

const TypeChangeNotify: React.FC = () => {
  const { trainType, leftStations } = useRecoilValue(navigationState);
  const { selectedDirection, stations, selectedBound } =
    useRecoilValue(stationState);
  const { selectedLine } = useRecoilValue(lineState);
  const typedTrainType = trainType as APITrainType;

  const joinedLineIds = (trainType as APITrainType)?.lines.map((l) => l.id);
  const currentLine = getCurrentLine(leftStations, joinedLineIds, selectedLine);
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

  const currentLineStations = stations.filter((s) =>
    s.lines.find((l) => l.id === currentLine.id)
  );
  const currentLineLastStation = useMemo(() => {
    if (selectedDirection === 'INBOUND') {
      return currentLineStations[currentLineStations.length - 1];
    }
    return currentLineStations[0];
  }, [currentLineStations, selectedDirection]);

  const headingTexts = useMemo((): {
    jaPrefix: string;
    enPrefix: string;
    jaSuffix?: string;
    enSuffix?: string;
  } => {
    if (getIsLocal(nextTrainType)) {
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

    return {
      jaPrefix: `${currentLineLastStation.name}から`,
      enPrefix: `From ${currentLineLastStation.nameR}, this train become ${aOrAn} `,
      jaSuffix: `${selectedBound.name}ゆき となります`,
      enSuffix: `train bound for ${selectedBound.nameR}.`,
    };
  }, [
    currentLineLastStation.name,
    currentLineLastStation.nameR,
    nextTrainType,
    selectedBound.name,
    selectedBound.nameR,
  ]);

  const trainTypeLeftVal = useMemo(() => {
    if (isPad) {
      return widthScale(barRight - 64);
    }
    if (!hasNotch()) {
      return widthScale(barRight);
    }
    return widthScale(barRight - 32);
  }, []);

  const trainTypeRightVal = useMemo(() => {
    if (isPad) {
      return heightScale(barRight - 64);
    }
    if (!hasNotch()) {
      return widthScale(barRight);
    }
    return widthScale(barRight - 32);
  }, []);

  const lineTextTopVal = useMemo(() => {
    if (isPad) {
      return heightScale(64);
    }
    if (!hasNotch()) {
      return heightScale(barRight + 28);
    }
    return heightScale(barRight + 8);
  }, []);

  const HeadingJa = () => {
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

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <HeadingJa />
        <HeadingEn />
      </View>
      <View style={styles.bottom}>
        <Text style={styles.headingJa}>{currentLineLastStation.name}</Text>
        <Text style={styles.headingEn}>{currentLineLastStation.nameR}</Text>
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
              right: barRight,
              width: barRightWidth,
              borderTopLeftRadius: 0,
              borderBottomLeftRadius: 0,
            }}
          />
          <LinearGradient
            colors={['#aaaaaaff', '#aaaaaabb']}
            style={{
              ...styles.bar,
              right: barRight,
              width: barRightWidth,
            }}
          />
          <LinearGradient
            colors={['#fff', '#000', '#000', '#fff']}
            locations={[0.5, 0.5, 0.5, 0.9]}
            style={{
              ...styles.bar,
              right: barRight,
              width: barRightWidth,
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
              right: barRight,
              width: barRightWidth,
            }}
          />
          <BarTerminalEast
            style={styles.barTerminal}
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
              <Text
                style={[
                  {
                    ...styles.text,
                  },
                ]}
              >
                {currentTrainType.name}
              </Text>
              <Text
                style={[
                  {
                    ...styles.text,
                    fontSize: RFValue(12),
                    lineHeight: RFValue(Platform.OS === 'ios' ? 12 : 12 + 4),
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
                  lineHeight: RFValue(Platform.OS === 'ios' ? 12 : 12 + 4),
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
                    lineHeight: RFValue(Platform.OS === 'ios' ? 12 : 12 + 4),
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
                  lineHeight: RFValue(Platform.OS === 'ios' ? 12 : 12 + 4),
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

import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  ImageSourcePropType,
} from 'react-native';
import { LineMark, MarkShape } from '../../lineMark';
import { Line } from '../../models/StationAPI';

interface Props {
  line: Line;
  mark: LineMark;
  small?: boolean;
}

const TransferLineMark: React.FC<Props> = ({ line, mark, small }: Props) => {
  const styles = StyleSheet.create({
    lineDot: {
      width: small ? 25.6 : 32,
      height: small ? 25.6 : 32,
      marginRight: 4,
    },
    lineMarkSquare: {
      borderWidth: 4,
      width: small ? 25.6 : 32,
      height: small ? 25.6 : 32,
      marginRight: 4,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 4,
    },
    lineMarkReversedSquare: {
      width: small ? 25.6 : 32,
      height: small ? 25.6 : 32,
      marginRight: 4,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 4,
    },
    lineMarkRound: {
      borderWidth: 6,
      width: small ? 25.6 : 32,
      height: small ? 25.6 : 32,
      marginRight: 4,
      borderRadius: 32,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    lineMarkReversedRound: {
      width: small ? 25.6 : 32,
      height: small ? 25.6 : 32,
      marginRight: 4,
      borderRadius: small ? 25.6 : 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    lineSignSingle: {
      textAlign: 'center',
      fontWeight: 'bold',
      fontSize: small ? 16 : 25.6,
      color: '#333',
    },
    lineSignDouble: {
      textAlign: 'center',
      fontWeight: 'bold',
      fontSize: small ? 9.6 : 12,
      color: '#333',
    },
    reversedText: {
      color: '#fff',
      fontSize: small ? 14.4 : 18,
    },
    reversedTextBlack: {
      color: '#000',
      fontSize: small ? 19.2 : 24,
    },
    lineMarkImage: {
      width: small ? 25.6 : 32,
      height: small ? 25.6 : 32,
      marginRight: 4,
    },
    signPathWrapper: {
      flexDirection: 'row',
    },
  });

  if (mark.signPath && mark.subSignPath) {
    return (
      <View style={styles.signPathWrapper}>
        <Image
          style={styles.lineMarkImage}
          source={(mark.signPath as unknown) as ImageSourcePropType}
        />
        <Image
          style={styles.lineMarkImage}
          source={(mark.subSignPath as unknown) as ImageSourcePropType}
        />
      </View>
    );
  }
  if (mark.signPath) {
    return (
      <Image
        style={styles.lineMarkImage}
        source={(mark.signPath as unknown) as ImageSourcePropType}
      />
    );
  }
  if (mark.subSign) {
    switch (mark.shape) {
      case MarkShape.square:
        return (
          <View style={styles.signPathWrapper}>
            <View
              style={[
                styles.lineMarkSquare,
                { borderColor: `#${line.lineColorC}` },
              ]}
            >
              <Text style={styles.lineSignSingle}>{mark.sign}</Text>
            </View>
            <View
              style={[
                styles.lineMarkSquare,
                { borderColor: `#${line.lineColorC}` },
              ]}
            >
              <Text style={styles.lineSignSingle}>{mark.subSign}</Text>
            </View>
          </View>
        );
      case MarkShape.reversedSquare:
        if (mark.signBlackText) {
          return (
            <View style={styles.signPathWrapper}>
              <View
                style={[
                  styles.lineMarkReversedSquare,
                  { backgroundColor: `#${line.lineColorC}` },
                ]}
              >
                <Text style={[styles.lineSignSingle, styles.reversedTextBlack]}>
                  {mark.sign}
                </Text>
              </View>
              <View
                style={[
                  styles.lineMarkReversedSquare,
                  { backgroundColor: `#${line.lineColorC}` },
                ]}
              >
                <Text style={[styles.lineSignSingle, styles.reversedTextBlack]}>
                  {mark.subSign}
                </Text>
              </View>
            </View>
          );
        }
        return (
          <View style={styles.signPathWrapper}>
            <View
              style={[
                styles.lineMarkReversedSquare,
                { backgroundColor: `#${line.lineColorC}` },
              ]}
            >
              <Text style={[styles.lineSignSingle, styles.reversedText]}>
                {mark.sign}
              </Text>
            </View>
            <View
              style={[
                styles.lineMarkReversedSquare,
                { backgroundColor: `#${line.lineColorC}` },
              ]}
            >
              <Text style={[styles.lineSignSingle, styles.reversedText]}>
                {mark.subSign}
              </Text>
            </View>
          </View>
        );
      case MarkShape.round:
        return (
          <View style={styles.signPathWrapper}>
            <View
              style={[
                styles.lineMarkRound,
                { borderColor: `#${line.lineColorC}` },
              ]}
            >
              <Text
                style={
                  mark.sign.length === 1
                    ? styles.lineSignSingle
                    : styles.lineSignDouble
                }
              >
                {mark.sign}
              </Text>
            </View>
            <View
              style={[
                styles.lineMarkRound,
                { borderColor: `#${line.lineColorC}` },
              ]}
            >
              <Text
                style={
                  mark.sign.length === 1
                    ? styles.lineSignSingle
                    : styles.lineSignDouble
                }
              >
                {mark.subSign}
              </Text>
            </View>
          </View>
        );
      case MarkShape.reversedRound:
        return (
          <View style={styles.signPathWrapper}>
            <View
              style={[
                styles.lineMarkReversedRound,
                { backgroundColor: `#${line.lineColorC}` },
              ]}
            >
              <Text style={[styles.lineSignSingle, styles.reversedText]}>
                {mark.sign}
              </Text>
            </View>
            <View
              style={[
                styles.lineMarkReversedRound,
                { backgroundColor: `#${line.lineColorC}` },
              ]}
            >
              <Text style={[styles.lineSignSingle, styles.reversedText]}>
                {mark.subSign}
              </Text>
            </View>
          </View>
        );
      default:
        return <></>;
    }
  }
  switch (mark.shape) {
    case MarkShape.square:
      return (
        <View
          style={[
            styles.lineMarkSquare,
            { borderColor: `#${line.lineColorC}` },
          ]}
        >
          <Text style={styles.lineSignSingle}>{mark.sign}</Text>
        </View>
      );
    case MarkShape.reversedSquare:
      if (mark.signBlackText) {
        return (
          <View
            style={[
              styles.lineMarkReversedSquare,
              { backgroundColor: `#${line.lineColorC}` },
            ]}
          >
            <Text style={[styles.lineSignSingle, styles.reversedTextBlack]}>
              {mark.sign}
            </Text>
          </View>
        );
      }
      return (
        <View
          style={[
            styles.lineMarkReversedSquare,
            { backgroundColor: `#${line.lineColorC}` },
          ]}
        >
          <Text style={[styles.lineSignSingle, styles.reversedText]}>
            {mark.sign}
          </Text>
        </View>
      );
    case MarkShape.round:
      return (
        <View
          style={[styles.lineMarkRound, { borderColor: `#${line.lineColorC}` }]}
        >
          <Text
            style={
              mark.sign.length === 1
                ? styles.lineSignSingle
                : styles.lineSignDouble
            }
          >
            {mark.sign}
          </Text>
        </View>
      );
    case MarkShape.reversedRound:
      return (
        <View
          style={[
            styles.lineMarkReversedRound,
            { backgroundColor: `#${line.lineColorC}` },
          ]}
        >
          <Text style={[styles.lineSignSingle, styles.reversedText]}>
            {mark.sign}
          </Text>
        </View>
      );
    default:
      return <></>;
  }
};

export default TransferLineMark;

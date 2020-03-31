import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { isIPad } from '../../helpers/ipad';
import { ILineMark, MarkShape } from '../../lineMark';
import { ILine } from '../../models/StationAPI';

interface IProps {
  line: ILine;
  mark: ILineMark;
  small?: boolean;
}

const TransferLineMark = ({ line, mark, small }: IProps) => {
  const styles = StyleSheet.create({
    lineDot: {
      width: isIPad && !small ? 48 : 32,
      height: isIPad && !small ? 48 : 32,
      marginRight: 4,
    },
    lineMarkSquare: {
      borderWidth: 4,
      width: isIPad && !small ? 48 : 32,
      height: isIPad && !small ? 48 : 32,
      marginRight: 4,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 4,
    },
    lineMarkReversedSquare: {
      width: isIPad && !small ? 48 : 32,
      height: isIPad && !small ? 48 : 32,
      marginRight: 4,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 4,
    },
    lineMarkRound: {
      borderWidth: 6,
      width: isIPad && !small ? 48 : 32,
      height: isIPad && !small ? 48 : 32,
      marginRight: 4,
      borderRadius: 32,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    lineMarkReversedRound: {
      width: isIPad && !small ? 48 : 32,
      height: isIPad && !small ? 48 : 32,
      marginRight: 4,
      borderRadius: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    lineSignSingle: {
      textAlign: 'center',
      fontWeight: 'bold',
      fontSize: isIPad && !small ? 32 : 16,
      color: '#333',
    },
    lineSignDouble: {
      textAlign: 'center',
      fontWeight: 'bold',
      fontSize: isIPad && !small ? 24 : 12,
      color: '#333',
    },
    reversedText: {
      color: '#fff',
      fontSize: isIPad && !small ? 28 : 18,
    },
    reversedTextBlack: {
      color: '#000',
      fontSize: isIPad && !small ? 28 : 24,
    },
    lineMarkImage: {
      width: isIPad && !small ? 48 : 32,
      height: isIPad && !small ? 48 : 32,
      marginRight: 4,
    },
    signPathWrapper: {
      flexDirection: 'row',
    },
  });

  if (mark.signPath && mark.subSignPath) {
    return (
      <View style={styles.signPathWrapper}>
          <Image style={styles.lineMarkImage} source={mark.signPath} />
          <Image style={styles.lineMarkImage} source={mark.subSignPath} />
      </View>
    );
  }
  if (mark.signPath) {
    return (
      <Image style={styles.lineMarkImage} source={mark.signPath} />
    );
  }
  if (mark.subSign) {
    switch (mark.shape) {
      case MarkShape.square:
        return (
          <View style={styles.signPathWrapper}>
            <View style={[styles.lineMarkSquare, { borderColor: `#${line.lineColorC}`}]}>
              <Text style={styles.lineSignSingle}>{mark.sign}</Text>
            </View>
            <View style={[styles.lineMarkSquare, { borderColor: `#${line.lineColorC}`}]}>
              <Text style={styles.lineSignSingle}>{mark.subSign}</Text>
            </View>
          </View>
        );
        case MarkShape.reversedSquare:
          if (mark.signBlackText) {
            return (
              <View style={styles.signPathWrapper}>
                <View style={[styles.lineMarkReversedSquare, { backgroundColor: `#${line.lineColorC}`}]}>
                  <Text style={[styles.lineSignSingle, styles.reversedTextBlack]}>{mark.sign}</Text>
                </View>
                <View style={[styles.lineMarkReversedSquare, { backgroundColor: `#${line.lineColorC}`}]}>
                  <Text style={[styles.lineSignSingle, styles.reversedTextBlack]}>{mark.subSign}</Text>
                </View>
              </View>
            );
          }
          return (
            <View style={styles.signPathWrapper}>
              <View style={[styles.lineMarkReversedSquare, { backgroundColor: `#${line.lineColorC}`}]}>
                <Text style={[styles.lineSignSingle, styles.reversedText]}>{mark.sign}</Text>
              </View>
              <View style={[styles.lineMarkReversedSquare, { backgroundColor: `#${line.lineColorC}`}]}>
                <Text style={[styles.lineSignSingle, styles.reversedText]}>{mark.subSign}</Text>
              </View>
            </View>
          );
          case MarkShape.round:
          return (
            <View style={styles.signPathWrapper}>
              <View style={[styles.lineMarkRound, { borderColor: `#${line.lineColorC}`}]}>
                <Text style={mark.sign.length === 1 ? styles.lineSignSingle : styles.lineSignDouble}>{mark.sign}</Text>
              </View>
              <View style={[styles.lineMarkRound, { borderColor: `#${line.lineColorC}`}]}>
                <Text
                  style={mark.sign.length === 1 ? styles.lineSignSingle : styles.lineSignDouble}
                >{mark.subSign}
                </Text>
              </View>
            </View>
          );
          case MarkShape.reversedRound:
            return (
              <View style={styles.signPathWrapper}>
                <View style={[styles.lineMarkReversedRound, { backgroundColor: `#${line.lineColorC}`}]}>
                  <Text style={[styles.lineSignSingle, styles.reversedText]}>{mark.sign}</Text>
                </View>
                <View style={[styles.lineMarkReversedRound, { backgroundColor: `#${line.lineColorC}`}]}>
                  <Text style={[styles.lineSignSingle, styles.reversedText]}>{mark.subSign}</Text>
                </View>
              </View>
            );
          }
  }
  switch (mark.shape) {
    case MarkShape.square:
      return (
        <View style={[styles.lineMarkSquare, { borderColor: `#${line.lineColorC}`}]}>
          <Text style={styles.lineSignSingle}>{mark.sign}</Text>
        </View>
      );
      case MarkShape.reversedSquare:
        if (mark.signBlackText) {
          return (
            <View style={[styles.lineMarkReversedSquare, { backgroundColor: `#${line.lineColorC}`}]}>
              <Text style={[styles.lineSignSingle, styles.reversedTextBlack]}>{mark.sign}</Text>
            </View>
          );
        }
        return (
          <View style={[styles.lineMarkReversedSquare, { backgroundColor: `#${line.lineColorC}`}]}>
            <Text style={[styles.lineSignSingle, styles.reversedText]}>{mark.sign}</Text>
          </View>
        );
        case MarkShape.round:
        return (
          <View style={[styles.lineMarkRound, { borderColor: `#${line.lineColorC}`}]}>
            <Text style={mark.sign.length === 1 ? styles.lineSignSingle : styles.lineSignDouble}>{mark.sign}</Text>
          </View>
        );
        case MarkShape.reversedRound:
          return (
            <View style={[styles.lineMarkReversedRound, { backgroundColor: `#${line.lineColorC}`}]}>
              <Text style={[styles.lineSignSingle, styles.reversedText]}>{mark.sign}</Text>
            </View>
          );
        }
};

export default TransferLineMark;

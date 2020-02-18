import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ILine } from '../../models/StationAPI';
import { getLineMark, ILineMark, MarkShape } from '../../lineMark';

interface IProps {
  lines: ILine[];
}

const styles = StyleSheet.create({
  transferLine: {
    flexBasis: '50%',
    marginBottom: 8,
  },
  bottom: {
    padding: 24,
  },
  headingText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#555',
    textAlign: 'center',
  },
  transferList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingTop: 24,
  },
  transferLineInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lineDot: {
    width: 32,
    height: 32,
    marginRight: 4,
  },
  lineName: {
    fontSize: 24,
    color: '#333',
    fontWeight: 'bold',
  },
  lineMarkSquare: {
    borderWidth: 4,
    width: 32,
    height: 32,
    marginRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  lineMarkReversedSquare: {
    width: 32,
    height: 32,
    marginRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lineMarkRound: {
    borderWidth: 6,
    width: 32,
    height: 32,
    marginRight: 4,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  lineMarkReversedRound: {
    width: 32,
    height: 32,
    marginRight: 4,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lineSignSingle: {
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
  },
  lineSignDouble: {
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 12,
    color: '#333',
  },
  reversedText: {
    color: '#fff',
    fontSize: 24,
  },
  lineMarkImage: {
    width: 32,
    height: 32,
    marginRight: 4,
  },
});

const renderLineDot = (line: ILine) => (<View style={[styles.lineDot, { backgroundColor: `#${line.lineColorC}`}]} />);
const renderLineMark = (line: ILine, mark: ILineMark) => {
  if (mark.signPath) {
    return (
      <Image style={styles.lineMarkImage} source={mark.signPath} />
    );
  }
  switch (mark.shape) {
    case MarkShape.square:
      return (
        <View style={[styles.lineMarkSquare, { borderColor: `#${line.lineColorC}`}]}>
          <Text style={styles.lineSignSingle}>{mark.sign}</Text>
        </View>
      );
      case MarkShape.reversedSquare:
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

const Transfers = (props: IProps) => {
  const { lines } = props;
  const renderTransferLines = () => (
    lines.map((line) => {
      const lineMark = getLineMark(line);
      return (
      <View style={styles.transferLine} key={line.id}>
        <View style={styles.transferLineInner} key={line.id}>
          {lineMark ? renderLineMark(line, lineMark) : renderLineDot(line)}
          <Text style={styles.lineName}>{line.name}</Text>
        </View>
      </View>
    );
      })
  );

  return (
      <ScrollView contentContainerStyle={styles.bottom}>
        <Text style={styles.headingText}>のりかえ</Text>

        <View style={styles.transferList}>
          {renderTransferLines()}
        </View>
      </ScrollView>
  );
};

export default Transfers;

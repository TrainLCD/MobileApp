/* eslint-disable react-native/no-unused-styles */
import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';
import { NUMBERING_ICON_SIZE } from '../constants/numbering';
import useIsEn from '../hooks/useIsEn';
import { LineMark } from '../models/LineMark';
import { Line, Station } from '../models/StationAPI';
import { APP_THEME, AppTheme } from '../models/Theme';
import isDifferentStationName from '../utils/differentStationName';
import isTablet from '../utils/isTablet';
import TransferLineDot from './TransferLineDot';
import TransferLineMark from './TransferLineMark';

type Props = {
  shouldGrayscale: boolean;
  lineMarks: (LineMark | null)[];
  transferLines: Line[];
  station: Station;
  theme?: AppTheme;
};

const windowWidth = Dimensions.get('window').width;

const stylesNormal = StyleSheet.create({
  root: {
    marginTop: 4,
  },
  lineMarkWrapper: {
    marginTop: 4,
    width: windowWidth / 10,
    flexDirection: 'row',
  },
  lineNameWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  lineName: {
    fontWeight: 'bold',
    fontSize: RFValue(7),
  },
  // JR西日本テーマのときだけ必要なので他のテーマでは空のスタイルにする
  topBar: {},
});

const stylesWest = StyleSheet.create({
  root: {
    marginTop: 16,
  },
  topBar: {
    width: 8,
    height: 16,
    backgroundColor: '#212121',
    alignSelf: 'center',
  },
  lineMarkWrapper: {
    marginTop: 4,
    width: windowWidth / 10,
    flexDirection: 'row',
  },
  lineNameWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  lineName: {
    fontWeight: 'bold',
    fontSize: RFValue(7),
  },
});

const PadLineMarks: React.FC<Props> = ({
  shouldGrayscale,
  lineMarks,
  transferLines,
  station,
  theme,
}) => {
  const isEn = useIsEn();
  const styles = useMemo(
    () => (theme === APP_THEME.JR_WEST ? stylesWest : stylesNormal),
    [theme]
  );

  if (!isTablet) {
    return <></>;
  }

  return (
    <View style={styles.root}>
      {!!lineMarks.length && theme === APP_THEME.JR_WEST && (
        <View style={styles.topBar} />
      )}

      {lineMarks.map((lm, i) =>
        lm ? (
          <View style={styles.lineMarkWrapper} key={transferLines[i]?.id}>
            <TransferLineMark
              line={transferLines[i]}
              mark={lm}
              size={NUMBERING_ICON_SIZE.TINY}
              shouldGrayscale={shouldGrayscale}
            />
            <View style={styles.lineNameWrapper}>
              <Text
                style={{
                  ...styles.lineName,
                  color: shouldGrayscale ? '#ccc' : 'black',
                }}
              >
                {`${isEn ? transferLines[i]?.nameR : transferLines[i]?.name}${
                  isDifferentStationName(station, transferLines[i])
                    ? `\n[ ${
                        isEn
                          ? transferLines[i]?.transferStation?.nameR
                          : transferLines[i]?.transferStation?.name
                      } ]`
                    : ''
                }`}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.lineMarkWrapper} key={transferLines[i]?.id}>
            <TransferLineDot
              key={transferLines[i]?.id}
              line={transferLines[i]}
              small
              shouldGrayscale={shouldGrayscale}
            />
            <Text
              style={{
                ...styles.lineName,
                color: shouldGrayscale ? '#ccc' : 'black',
              }}
            >
              {isEn ? transferLines[i]?.nameR : transferLines[i].name}
            </Text>
          </View>
        )
      )}
    </View>
  );
};

PadLineMarks.defaultProps = { theme: undefined };

export default PadLineMarks;

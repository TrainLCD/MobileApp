import { useAtomValue } from 'jotai';
/* eslint-disable react-native/no-unused-styles */
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { NUMBERING_ICON_SIZE, parenthesisRegexp } from '~/constants';
import type { Line, Station } from '~/gen/proto/stationapi_pb';
import { useGetLineMark, useIsDifferentStationName } from '~/hooks';
import { APP_THEME, type AppTheme } from '~/models/Theme';
import { isEnAtom } from '~/store/selectors/isEn';
import isTablet from '~/utils/isTablet';
import { RFValue } from '~/utils/rfValue';
import TransferLineDot from './TransferLineDot';
import TransferLineMark from './TransferLineMark';
import Typography from './Typography';

type Props = {
  shouldGrayscale: boolean;
  transferLines: Line[];
  station: Station;
  theme?: AppTheme;
};

const stylesNormal = StyleSheet.create({
  root: {
    marginTop: 4,
  },
  lineMarkWrapper: {
    marginTop: 4,
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
    marginTop: 6,
  },
  lineMarkWrapper: {
    marginTop: 4,
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
  transferLines,
  station,
  theme,
}) => {
  const isEn = useAtomValue(isEnAtom);

  const styles = useMemo(
    () => (theme === APP_THEME.JR_WEST ? stylesWest : stylesNormal),
    [theme]
  );
  const getLineMarkFunc = useGetLineMark();

  const lineMarks = useMemo(
    () =>
      transferLines.map((line) => getLineMarkFunc({ line, shouldGrayscale })),
    [getLineMarkFunc, shouldGrayscale, transferLines]
  );

  const isDifferentStationName = useIsDifferentStationName();

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
              size={NUMBERING_ICON_SIZE.SMALL}
              shouldGrayscale={shouldGrayscale}
            />
            <View style={styles.lineNameWrapper}>
              <Typography
                style={[
                  styles.lineName,
                  {
                    color: shouldGrayscale ? '#ccc' : 'black',
                  },
                ]}
              >
                {`${
                  isEn
                    ? transferLines[i]?.nameRoman?.replace(
                        parenthesisRegexp,
                        ''
                      )
                    : transferLines[i]?.nameShort.replace(parenthesisRegexp, '')
                }${
                  isDifferentStationName(station, transferLines[i])
                    ? `\n[ ${
                        isEn
                          ? transferLines[i]?.station?.nameRoman?.replace(
                              parenthesisRegexp,
                              ''
                            )
                          : transferLines[i]?.station?.name.replace(
                              parenthesisRegexp,
                              ''
                            )
                      } ]`
                    : ''
                }`}
              </Typography>
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
            <Typography
              style={[
                styles.lineName,
                {
                  color: shouldGrayscale ? '#ccc' : 'black',
                },
              ]}
            >
              {isEn ? transferLines[i]?.nameRoman : transferLines[i]?.nameShort}
            </Typography>
          </View>
        )
      )}
    </View>
  );
};

export default React.memo(PadLineMarks);

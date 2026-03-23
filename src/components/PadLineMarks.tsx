import { useAtomValue } from 'jotai';
/* eslint-disable react-native/no-unused-styles */
import React, { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import type { Line, Station } from '~/@types/graphql';
import { NUMBERING_ICON_SIZE, parenthesisRegexp } from '~/constants';
import { useGetLineMark, useIsDifferentStationName } from '~/hooks';
import { useScale } from '~/hooks/useScale';
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
  lineMarkWrapper: {
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
    marginTop: Platform.select({ android: 16, default: 6 }),
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
      transferLines.map((line) =>
        getLineMarkFunc({
          line,
          shouldGrayscale,
          stationNumbers: line.station?.stationNumbers,
        })
      ),
    [getLineMarkFunc, shouldGrayscale, transferLines]
  );

  const isDifferentStationName = useIsDifferentStationName();

  const lineLabels = useMemo(
    () =>
      transferLines.map((tl) => {
        const name = isEn
          ? tl.nameRoman?.replace(parenthesisRegexp, '')
          : tl.nameShort?.replace(parenthesisRegexp, '');
        const diff = isDifferentStationName(station, tl);
        const suffix = diff
          ? `\n[ ${
              isEn
                ? tl.station?.nameRoman?.replace(parenthesisRegexp, '')
                : tl.station?.name?.replace(parenthesisRegexp, '')
            } ]`
          : '';
        return `${name}${suffix}`;
      }),
    [transferLines, isEn, isDifferentStationName, station]
  );

  const { heightScale } = useScale();

  const lineMarkItemStyle = useMemo(
    () => [styles.lineMarkWrapper, { marginTop: heightScale(4) }],
    [heightScale, styles.lineMarkWrapper]
  );

  if (!isTablet) {
    return <></>;
  }

  return (
    <View
      style={{
        marginTop: heightScale(
          Platform.select({ ios: 8, android: 0, default: 0 })
        ),
      }}
    >
      {!!lineMarks.length && theme === APP_THEME.JR_WEST && (
        <View style={styles.topBar} />
      )}

      {lineMarks.map((lm, i) =>
        lm ? (
          <View style={lineMarkItemStyle} key={transferLines[i]?.id}>
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
                {lineLabels[i]}
              </Typography>
            </View>
          </View>
        ) : (
          <View style={lineMarkItemStyle} key={transferLines[i]?.id}>
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

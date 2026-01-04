import { useAtomValue } from 'jotai';
import React, { useCallback, useMemo } from 'react';
import {
  FlatList,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import type { Line, Station } from '~/@types/graphql';
import { NUMBERING_ICON_SIZE, parenthesisRegexp } from '../constants';
import {
  useCurrentStation,
  useGetLineMark,
  useNextStation,
  useTransferLines,
} from '../hooks';
import type { AppTheme } from '../models/Theme';
import stationState from '../store/atoms/station';
import { isLEDThemeAtom } from '../store/atoms/theme';
import isTablet from '../utils/isTablet';
import { RFValue } from '../utils/rfValue';
import NumberingIcon from './NumberingIcon';
import TransferLineDot from './TransferLineDot';
import TransferLineMark from './TransferLineMark';
import { TransfersHeading } from './TransfersHeading';
import Typography from './Typography';

interface Props {
  onPress: (station?: Station) => void;
  theme: AppTheme;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  transferLine: {
    flexDirection: 'row',
    marginBottom: isTablet ? 16 : 8,
  },
  transferView: {
    padding: isTablet ? 32 : 24,
    paddingBottom: isTablet ? 128 : 84,
  },
  transferLineInnerLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    flexBasis: '50%',
    paddingLeft: isTablet ? '15%' : '5%',
  },
  transferLineInnerRight: {
    alignItems: 'center',
    flexDirection: 'row',
    flexBasis: '50%',
  },
  lineNameContainer: {
    marginLeft: isTablet ? 4 : 2,
  },
  lineName: {
    fontSize: RFValue(18),
    color: '#333',
    fontWeight: 'bold',
  },
  lineNameEn: {
    fontSize: RFValue(12),
    color: '#333',
    fontWeight: 'bold',
  },

  numberingIconContainer: {
    width: (isTablet ? 72 * 1.5 : 72) / 1.25,
    height: (isTablet ? 72 * 1.5 : 72) / 1.25,
    transform: [{ scale: 0.5 }],
  },
});

const Transfers: React.FC<Props> = ({ onPress, theme }: Props) => {
  const { arrived } = useAtomValue(stationState);
  const currentStation = useCurrentStation();

  const lines = useTransferLines();
  const nextStation = useNextStation();
  const getLineMarkFunc = useGetLineMark();
  const isLEDTheme = useAtomValue(isLEDThemeAtom);

  const station = useMemo(
    () => (arrived ? currentStation : nextStation),
    [arrived, currentStation, nextStation]
  );

  const stationNumbers = useMemo(
    () =>
      lines
        ?.map((l) => l)
        ?.map((l) => {
          const stationNumberData = l.station?.stationNumbers?.find((sn) =>
            l.lineSymbols?.some((sym) => sym.symbol === sn.lineSymbol)
          );
          const lineSymbol = stationNumberData?.lineSymbol ?? '';
          const lineSymbolColor = stationNumberData?.lineSymbolColor ?? '';
          const stationNumber = stationNumberData?.stationNumber ?? '';
          const lineSymbolShape = stationNumberData?.lineSymbolShape ?? 'NOOP';

          if (!lineSymbol.length || !stationNumber.length) {
            const stationNumberWhenEmptySymbol =
              l.station?.stationNumbers?.find((sn) => !sn.lineSymbol?.length)
                ?.stationNumber ?? '';
            const lineSymbolWhenEmptySymbol = l.lineSymbols?.[0]?.symbol ?? '';
            const lineSymbolColorWhenEmptySymbol =
              l.station?.stationNumbers?.find((sn) => !sn.lineSymbol?.length)
                ?.lineSymbolColor ?? '#000000';
            const lineSymbolShapeWhenEmptySymbol =
              l.station?.stationNumbers?.find((sn) => !sn.lineSymbol?.length)
                ?.lineSymbolShape ?? 'NOOP';

            return {
              __typename: 'StationNumber' as const,
              lineSymbol: lineSymbolWhenEmptySymbol,
              lineSymbolColor: lineSymbolColorWhenEmptySymbol,
              stationNumber: stationNumberWhenEmptySymbol,
              lineSymbolShape: lineSymbolShapeWhenEmptySymbol,
            };
          }

          return {
            __typename: 'StationNumber' as const,
            lineSymbol,
            lineSymbolColor,
            stationNumber,
            lineSymbolShape,
          };
        }),
    [lines]
  );

  const renderTransferLine = useCallback(
    ({ item: line, index }: { item: Line; index: number }) => {
      if (!station) {
        return null;
      }
      const lineMark = getLineMarkFunc({
        line,
      });
      const includesNumberedStation = stationNumbers.some(
        (sn) => !!sn?.stationNumber
      );
      return (
        <View style={styles.transferLine} key={line.id}>
          <View style={styles.transferLineInnerLeft}>
            {lineMark ? (
              <TransferLineMark
                line={line}
                mark={lineMark}
                size={NUMBERING_ICON_SIZE.MEDIUM}
              />
            ) : (
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => {
                  if (!line.station) {
                    return;
                  }
                  onPress({
                    ...line.station,
                    __typename: 'Station',
                    line,
                    lines,
                  } as Station);
                }}
              >
                <TransferLineDot line={line} />
              </TouchableOpacity>
            )}
            <View style={styles.lineNameContainer}>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => {
                  if (!line.station) {
                    return;
                  }
                  onPress({
                    ...line.station,
                    __typename: 'Station',
                    line,
                    lines,
                  } as Station);
                }}
              >
                <Typography style={styles.lineName}>
                  {line.nameShort?.replace(parenthesisRegexp, '')}
                </Typography>
                {line.nameRoman ? (
                  <Typography style={styles.lineNameEn}>
                    {line.nameRoman.replace(parenthesisRegexp, '')}
                  </Typography>
                ) : null}
                {!!line.nameChinese?.length && !!line.nameKorean?.length ? (
                  <Typography style={styles.lineNameEn}>
                    {`${line.nameChinese.replace(
                      parenthesisRegexp,
                      ''
                    )} / ${line.nameKorean.replace(parenthesisRegexp, '')}`}
                  </Typography>
                ) : null}
              </TouchableOpacity>
            </View>
          </View>
          {includesNumberedStation ? (
            <View style={styles.transferLineInnerRight}>
              {stationNumbers[index] ? (
                <TouchableOpacity
                  onPress={() => {
                    if (!line.station) {
                      return;
                    }
                    onPress({
                      ...line.station,
                      __typename: 'Station',
                      line,
                      lines,
                    } as Station);
                  }}
                  activeOpacity={1}
                  style={styles.numberingIconContainer}
                >
                  <NumberingIcon
                    shape={stationNumbers[index].lineSymbolShape ?? 'NOOP'}
                    lineColor={
                      stationNumbers[index]?.lineSymbolColor ?? '#000000'
                    }
                    stationNumber={stationNumbers[index]?.stationNumber ?? ''}
                    allowScaling={false}
                  />
                </TouchableOpacity>
              ) : (
                <View style={styles.numberingIconContainer} />
              )}
              {line.station && (
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={() => {
                    if (!line.station) {
                      return;
                    }
                    onPress({
                      ...line.station,
                      __typename: 'Station',
                      line,
                      lines,
                    } as Station);
                  }}
                >
                  <Typography style={styles.lineName}>
                    {`${line.station?.name?.replace(parenthesisRegexp, '')}駅`}
                  </Typography>
                  <Typography style={styles.lineNameEn}>
                    {`${(line.station?.nameRoman ?? '').replace(
                      parenthesisRegexp,
                      ''
                    )} Sta.`}
                  </Typography>
                  <Typography style={styles.lineNameEn}>
                    {`${(line.station?.nameChinese ?? '').replace(
                      parenthesisRegexp,
                      ''
                    )}站 / ${(line.station?.nameKorean ?? '').replace(
                      parenthesisRegexp,
                      ''
                    )}역`}
                  </Typography>
                </TouchableOpacity>
              )}
            </View>
          ) : null}
        </View>
      );
    },
    [getLineMarkFunc, onPress, station, stationNumbers, lines]
  );

  if (isLEDTheme) {
    return null;
  }

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={1}
      onPress={() => onPress()}
    >
      <TransfersHeading theme={theme} />
      <FlatList
        contentContainerStyle={styles.transferView}
        data={lines}
        keyExtractor={(l) => (l.id ?? 0).toString()}
        renderItem={renderTransferLine}
        removeClippedSubviews={Platform.OS === 'android'}
      />
    </TouchableOpacity>
  );
};

export default React.memo(Transfers);

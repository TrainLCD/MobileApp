import { useAtomValue } from 'jotai';
import React, { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import type { Line, Station } from '~/@types/graphql';
import { NUMBERING_ICON_SIZE, parenthesisRegexp } from '../constants';
import { useGetLineMark, useTransferLines } from '../hooks';
import type { AppTheme } from '../models/Theme';
import { enabledLanguagesAtom } from '../store/atoms/navigation';
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
    flex: 1,
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
  const lines = useTransferLines();
  const getLineMarkFunc = useGetLineMark();
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const enabledLanguages = useAtomValue(enabledLanguagesAtom);

  const isJaEnabled = enabledLanguages.includes('JA');
  const isEnEnabled = enabledLanguages.includes('EN');
  const isZhEnabled = enabledLanguages.includes('ZH');
  const isKoEnabled = enabledLanguages.includes('KO');

  const stationNumbers = useMemo(
    () =>
      lines?.map((l) => {
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
            l.station?.stationNumbers?.find(
              (sn) => !sn.lineSymbol?.length
            )?.lineSymbolShape;

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
      const lineMark = getLineMarkFunc({
        line,
        stationNumbers: line?.station?.stationNumbers,
      });
      const includesNumberedStation = stationNumbers.some(
        (sn) => !!sn?.stationNumber
      );

      const cjkLineName = [
        isZhEnabled ? line.nameChinese : null,
        isKoEnabled ? line.nameKorean : null,
      ]
        .filter((s): s is string => !!s?.length)
        .map((s) => s.replace(parenthesisRegexp, ''))
        .join(' / ');

      const cjkStationName = [
        isZhEnabled && line.station?.nameChinese
          ? `${line.station.nameChinese.replace(parenthesisRegexp, '')}站`
          : null,
        isKoEnabled && line.station?.nameKorean
          ? `${line.station.nameKorean.replace(parenthesisRegexp, '')}역`
          : null,
      ]
        .filter((s): s is string => !!s?.length)
        .join(' / ');

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
                {isJaEnabled && line.nameShort ? (
                  <Typography style={styles.lineName}>
                    {line.nameShort.replace(parenthesisRegexp, '')}
                  </Typography>
                ) : null}
                {isEnEnabled && line.nameRoman ? (
                  <Typography
                    style={isJaEnabled ? styles.lineNameEn : styles.lineName}
                  >
                    {line.nameRoman.replace(parenthesisRegexp, '')}
                  </Typography>
                ) : null}
                {cjkLineName ? (
                  <Typography style={styles.lineNameEn}>
                    {cjkLineName}
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
                  {isJaEnabled && line.station?.name ? (
                    <Typography style={styles.lineName}>
                      {`${line.station.name.replace(parenthesisRegexp, '')}駅`}
                    </Typography>
                  ) : null}
                  {isEnEnabled && line.station?.nameRoman ? (
                    <Typography
                      style={isJaEnabled ? styles.lineNameEn : styles.lineName}
                    >
                      {`${line.station.nameRoman.replace(
                        parenthesisRegexp,
                        ''
                      )} Sta.`}
                    </Typography>
                  ) : null}
                  {cjkStationName ? (
                    <Typography style={styles.lineNameEn}>
                      {cjkStationName}
                    </Typography>
                  ) : null}
                </TouchableOpacity>
              )}
            </View>
          ) : null}
        </View>
      );
    },
    [
      getLineMarkFunc,
      onPress,
      stationNumbers,
      lines,
      isJaEnabled,
      isEnEnabled,
      isZhEnabled,
      isKoEnabled,
    ]
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
      />
    </TouchableOpacity>
  );
};

export default React.memo(Transfers);

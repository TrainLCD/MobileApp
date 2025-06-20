import { useAtomValue } from 'jotai';
import React, { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Line, Station, StationNumber } from '~/gen/proto/stationapi_pb';
import { NUMBERING_ICON_SIZE, parenthesisRegexp } from '../constants';
import {
  useCurrentStation,
  useGetLineMark,
  useNextStation,
  useThemeStore,
  useTransferLines,
} from '../hooks';
import { APP_THEME, type AppTheme } from '../models/Theme';
import stationState from '../store/atoms/station';
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
  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED);

  const station = useMemo(
    () => (arrived ? currentStation : nextStation),
    [arrived, currentStation, nextStation]
  );

  const stationNumbers = useMemo(
    () =>
      lines
        ?.map((l) => new Line(l))
        ?.map<StationNumber>((l) => {
          const lineSymbol =
            l.station?.stationNumbers?.find((sn) =>
              l.lineSymbols.some((sym) => sym.symbol === sn.lineSymbol)
            )?.lineSymbol ?? '';
          const lineSymbolColor =
            l.station?.stationNumbers?.find((sn) =>
              l.lineSymbols.some((sym) => sym.symbol === sn.lineSymbol)
            )?.lineSymbolColor ?? '';
          const stationNumber =
            l.station?.stationNumbers?.find((sn) =>
              l.lineSymbols.some((sym) => sym.symbol === sn.lineSymbol)
            )?.stationNumber ?? '';
          const lineSymbolShape =
            l.station?.stationNumbers?.find((sn) =>
              l.lineSymbols.some((sym) => sym.symbol === sn.lineSymbol)
            )?.lineSymbolShape ?? 'NOOP';

          if (!lineSymbol.length || !stationNumber.length) {
            const stationNumberWhenEmptySymbol =
              l.station?.stationNumbers?.find((sn) => !sn.lineSymbol.length)
                ?.stationNumber ?? '';
            const lineSymbolColorWhenEmptySymbol =
              l.station?.stationNumbers?.find((sn) => !sn.lineSymbol.length)
                ?.lineSymbolColor ?? '#000000';
            const lineSymbolShapeWhenEmptySymbol =
              l.station?.stationNumbers?.find((sn) => !sn.lineSymbol.length)
                ?.lineSymbolShape ?? 'NOOP';

            return new StationNumber({
              lineSymbol: stationNumberWhenEmptySymbol,
              lineSymbolColor: lineSymbolColorWhenEmptySymbol,
              stationNumber: stationNumberWhenEmptySymbol,
              lineSymbolShape: lineSymbolShapeWhenEmptySymbol,
            });
          }

          return new StationNumber({
            lineSymbol,
            lineSymbolColor,
            stationNumber,
            lineSymbolShape,
          });
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
                onPress={() =>
                  onPress(new Station({ ...line.station, line, lines }))
                }
              >
                <TransferLineDot line={line} />
              </TouchableOpacity>
            )}
            <View style={styles.lineNameContainer}>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() =>
                  onPress(new Station({ ...line.station, line, lines }))
                }
              >
                <Typography style={styles.lineName}>
                  {line.nameShort.replace(parenthesisRegexp, '')}
                </Typography>
                <Typography style={styles.lineNameEn}>
                  {line.nameRoman?.replace(parenthesisRegexp, '')}
                </Typography>
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
                  onPress={() =>
                    onPress(new Station({ ...line.station, line, lines }))
                  }
                  activeOpacity={1}
                  style={styles.numberingIconContainer}
                >
                  <NumberingIcon
                    shape={stationNumbers[index].lineSymbolShape}
                    lineColor={stationNumbers[index]?.lineSymbolColor}
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
                  onPress={() =>
                    onPress(new Station({ ...line.station, line, lines }))
                  }
                >
                  <Typography style={styles.lineName}>
                    {`${line.station?.name.replace(parenthesisRegexp, '')}駅`}
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
        keyExtractor={(l) => l.id.toString()}
        renderItem={renderTransferLine}
      />
    </TouchableOpacity>
  );
};

export default React.memo(Transfers);

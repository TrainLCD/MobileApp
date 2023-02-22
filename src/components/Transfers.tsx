import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
import { RFValue } from 'react-native-responsive-fontsize';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NUMBERING_ICON_SIZE } from '../constants/numbering';
import { parenthesisRegexp } from '../constants/regexp';
import useGetLineMark from '../hooks/useGetLineMark';
import useTransferLines from '../hooks/useTransferLines';
import { Station, StationNumber } from '../models/StationAPI';
import { AppTheme, APP_THEME } from '../models/Theme';
import { translate } from '../translation';
import isTablet from '../utils/isTablet';
import Heading from './Heading';
import NumberingIcon from './NumberingIcon';
import TransferLineDot from './TransferLineDot';
import TransferLineMark from './TransferLineMark';

interface Props {
  onPress: () => void;
  theme: AppTheme;
  station: Station;
}

const styles = StyleSheet.create({
  scrollViewContainer: {
    paddingBottom: isTablet ? 128 : 84,
  },
  transferLine: {
    flexDirection: 'row',
    marginBottom: isTablet ? 16 : 8,
  },
  transferList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: isTablet ? 32 : 24,
  },
  transferLineInner: {
    flexDirection: 'row',
    alignItems: 'center',
    flexBasis: '50%',
  },
  lineNameContainer: {
    width: '85%',
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
  headingContainerMetro: {
    height: RFValue(32),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headingContainerSaikyo: {
    marginTop: 24,
    width: '75%',
    alignSelf: 'center',
  },
  trasnferStationInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stationNameContainer: {},
  numberingIconContainer: {
    width: (isTablet ? 72 * 1.5 : 72) / 1.25,
    height: (isTablet ? 72 * 1.5 : 72) / 1.25,
    transform: [{ scale: 0.5 }],
  },
});

const Transfers: React.FC<Props> = ({ onPress, theme, station }: Props) => {
  const lines = useTransferLines();
  const lineIds = useMemo(() => lines.map((l) => l.id), [lines]);

  const stationNumbers = useMemo(
    () =>
      station?.lines
        ?.filter((l) => lineIds.includes(l.id))
        ?.map<StationNumber | null>((l) => ({
          lineSymbol:
            l.transferStation?.stationNumbers?.find((sn) =>
              l.lineSymbols.some((sym) => sym.lineSymbol === sn.lineSymbol)
            )?.lineSymbol ?? '',
          lineSymbolColor:
            l.transferStation?.stationNumbers?.find((sn) =>
              l.lineSymbols.some((sym) => sym.lineSymbol === sn.lineSymbol)
            )?.lineSymbolColor ?? '',
          stationNumber:
            l.transferStation?.stationNumbers?.find((sn) =>
              l.lineSymbols.some((sym) => sym.lineSymbol === sn.lineSymbol)
            )?.stationNumber ?? '',
        })),
    [lineIds, station?.lines]
  );

  const { left: safeAreaLeft } = useSafeAreaInsets();
  const getLineMarkFunc = useGetLineMark();

  const renderTransferLines = useCallback(
    (): (JSX.Element | null)[] =>
      lines.map((line, index) => {
        if (!station) {
          return null;
        }

        const lineMark = getLineMarkFunc(station, line);
        const includesNumberedStation = stationNumbers?.some(
          (sn) => !!sn?.stationNumber
        );

        return (
          <View style={styles.transferLine} key={line.id}>
            <>
              <View style={styles.transferLineInner}>
                {lineMark ? (
                  <TransferLineMark
                    line={line}
                    mark={lineMark}
                    size={NUMBERING_ICON_SIZE.SMALL}
                  />
                ) : (
                  <TransferLineDot line={line} />
                )}
                <View style={styles.lineNameContainer}>
                  <Text style={styles.lineName}>
                    {line.name.replace(parenthesisRegexp, '')}
                  </Text>
                  <Text style={styles.lineNameEn}>
                    {line.nameR.replace(parenthesisRegexp, '')}
                  </Text>
                  {!!line.nameZh.length && !!line.nameKo.length ? (
                    <Text style={styles.lineNameEn}>
                      {`${line.nameZh.replace(
                        parenthesisRegexp,
                        ''
                      )} / ${line.nameKo.replace(parenthesisRegexp, '')}`}
                    </Text>
                  ) : null}
                </View>
              </View>
              {includesNumberedStation ? (
                <View style={styles.trasnferStationInner}>
                  {lineMark && stationNumbers?.[index]?.stationNumber ? (
                    <View style={styles.numberingIconContainer}>
                      <NumberingIcon
                        shape={lineMark.signShape}
                        lineColor={`#${stationNumbers?.[index]?.lineSymbolColor}`}
                        stationNumber={
                          stationNumbers?.[index]?.stationNumber ?? ''
                        }
                        allowScaling={false}
                      />
                    </View>
                  ) : (
                    <View style={styles.numberingIconContainer} />
                  )}
                  {line.transferStation && (
                    <View style={styles.stationNameContainer}>
                      <Text style={styles.lineName}>
                        {`${line.transferStation?.name.replace(
                          parenthesisRegexp,
                          ''
                        )}駅`}
                      </Text>
                      <Text style={styles.lineNameEn}>
                        {`${line.transferStation?.nameR.replace(
                          parenthesisRegexp,
                          ''
                        )} Sta.`}
                      </Text>
                      <Text style={styles.lineNameEn}>
                        {`${line.transferStation?.nameZh.replace(
                          parenthesisRegexp,
                          ''
                        )}站 / ${line.transferStation?.nameKo.replace(
                          parenthesisRegexp,
                          ''
                        )}역`}
                      </Text>
                    </View>
                  )}
                </View>
              ) : null}
            </>
          </View>
        );
      }),
    [getLineMarkFunc, lines, station, stationNumbers]
  );

  const CustomHeading = () => {
    switch (theme) {
      case APP_THEME.TOKYO_METRO:
      case APP_THEME.TY:
      case APP_THEME.TOEI:
        return (
          <LinearGradient
            colors={['#fcfcfc', '#f5f5f5', '#ddd']}
            locations={[0, 0.95, 1]}
            style={styles.headingContainerMetro}
          >
            <Heading>{translate('transfer')}</Heading>
          </LinearGradient>
        );
      case APP_THEME.SAIKYO:
        return (
          <LinearGradient
            colors={['white', '#ccc', '#ccc', 'white']}
            start={[0, 1]}
            end={[1, 0]}
            locations={[0, 0.1, 0.9, 1]}
            style={styles.headingContainerSaikyo}
          >
            <Heading style={{ color: '#212121', fontWeight: '600' }}>
              {translate('transfer')}
            </Heading>
          </LinearGradient>
        );
      default:
        return (
          <Heading style={{ marginTop: 24 }}>{translate('transfer')}</Heading>
        );
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollViewContainer}>
      <TouchableWithoutFeedback
        onPress={onPress}
        containerStyle={{
          flex: 1,
        }}
      >
        <CustomHeading />
        <View style={{ ...styles.transferList, marginLeft: safeAreaLeft }}>
          {renderTransferLines()}
        </View>
      </TouchableWithoutFeedback>
    </ScrollView>
  );
};

export default Transfers;

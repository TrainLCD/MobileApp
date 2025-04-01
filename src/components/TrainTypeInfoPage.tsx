import type { ConnectError } from '@connectrpc/connect';
import uniqBy from 'lodash/uniqBy';
import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRecoilValue } from 'recoil';
import {
  Line,
  type Station,
  type TrainType,
} from '../../gen/proto/stationapi_pb';
import { LED_THEME_BG_COLOR } from '../constants';
import { useCurrentStation } from '../hooks/useCurrentStation';
import { useThemeStore } from '../hooks/useThemeStore';
import { APP_THEME } from '../models/Theme';
import lineState from '../store/atoms/line';
import { isJapanese, translate } from '../translation';
import dropEitherJunctionStation from '../utils/dropJunctionStation';
import getIsPass from '../utils/isPass';
import isTablet from '../utils/isTablet';
import { RFValue } from '../utils/rfValue';
import Button from './Button';
import Heading from './Heading';
import LEDThemeSwitch from './LEDThemeSwitch';
import Typography from './Typography';

type Props = {
  trainType: TrainType | null;
  finalStation?: Station;
  stations: Station[];
  loading: boolean;
  disabled?: boolean;
  error: ConnectError | null;
  onClose: () => void;
  onConfirmed: (trainType: TrainType | undefined, asTerminus?: boolean) => void;
  fromRouteListModal?: boolean;
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('screen');

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: '100%',
    height: '100%',
  },
  scrollView: {
    paddingVertical: 24,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: isTablet ? 'auto' : '100%',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 16,
  },
  enableTerminusSwitchContainer: {
    flexDirection: 'row',
    marginVertical: 12,
  },
  enableTerminusText: {
    fontWeight: 'bold',
    alignSelf: 'center',
    fontSize: RFValue(11),
  },
  trainTypeList: {
    marginTop: 8,
    maxHeight: '35%',
  },
  trainTypeListContent: {
    flexWrap: 'wrap',
    flexDirection: 'column',
    rowGap: 4,
    columnGap: 48,
  },
  trainTypeItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorIndicator: {
    width: 10,
    height: 10,
    borderRadius: 8,
    marginRight: 2,
  },
  trainTypeLineName: {
    fontSize: RFValue(11),
    lineHeight: RFValue(14),
    flex: 1,
  },
  lineTrainTypeName: {
    textAlign: 'right',
    fontSize: RFValue(11),
    fontWeight: 'bold',
    lineHeight: RFValue(14),
  },
});

const SAFE_AREA_FALLBACK = 32;

const TrainTypeItem = React.memo(
  ({
    line,
    outOfLineRange,
  }: { line: Line | null; outOfLineRange: boolean }) => (
    <View
      style={[
        styles.trainTypeItemContainer,
        outOfLineRange && { opacity: 0.5 },
      ]}
      key={line?.id}
    >
      <View
        style={{
          ...styles.colorIndicator,
          backgroundColor: line?.color ?? '#000000',
        }}
      />
      <Typography style={styles.trainTypeLineName}>
        {(isJapanese ? line?.nameShort : line?.nameRoman) ?? ''}:{' '}
      </Typography>
      <Typography
        style={{
          ...styles.lineTrainTypeName,
          color: line?.trainType?.color ?? '#000000',
        }}
      >
        {isJapanese
          ? (line?.trainType?.name ?? '普通/各駅停車')
          : (line?.trainType?.nameRoman ?? 'Local')}
      </Typography>
    </View>
  )
);

export const TrainTypeInfoPage: React.FC<Props> = ({
  trainType,
  finalStation,
  stations,
  loading,
  disabled,
  onClose,
  onConfirmed,
  fromRouteListModal,
}: Props) => {
  const currentStation = useCurrentStation();

  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED);

  const [asTerminus, setAsTerminus] = useState(false);

  const { selectedLine } = useRecoilValue(lineState);

  const { left: leftSafeArea, right: rightSafeArea } = useSafeAreaInsets();

  const stopStations = useMemo(() => {
    const stops = dropEitherJunctionStation(stations)
      .filter((s) => !getIsPass(s))
      .filter((s) => s !== undefined);

    const curIndex = stops.findIndex(
      (s) => s.groupId === currentStation?.groupId
    );
    const finalIndex = stops.findIndex(
      (s) => s.groupId === finalStation?.groupId
    );

    if (curIndex > finalIndex) {
      const reversedStops = stops.slice().reverse();
      return uniqBy(
        reversedStops.slice(
          reversedStops.findIndex((s) => s.groupId === currentStation?.groupId)
        ),
        'id'
      );
    }

    return uniqBy(stops.slice(curIndex), 'id');
  }, [stations, currentStation?.groupId, finalStation?.groupId]);

  const afterFinalLines = useMemo(
    () =>
      uniqBy(stopStations, 'line.id')
        .reduce<Line[]>((acc, sta, idx, arr) => {
          if (!finalStation) {
            return [];
          }

          const finalIndex = arr.findIndex(
            (s) => s.line?.id === finalStation.line?.id
          );

          if (!sta.line || idx < finalIndex) {
            return acc;
          }

          return acc.concat(sta.line);
        }, [])
        .slice(1),
    [stopStations, finalStation]
  );

  const afterFinalStations = useMemo(() => {
    if (!finalStation) {
      return [];
    }

    const finalIndex = stopStations.findIndex(
      (s) => s.groupId === finalStation.groupId
    );

    return stopStations.slice(finalIndex + 1, stopStations.length);
  }, [stopStations, finalStation]);

  const trainTypeLines = useMemo(
    () =>
      trainType?.lines.length
        ? uniqBy(
            stopStations.map(
              (s) =>
                new Line({
                  ...s.line,
                  trainType: trainType.lines.find((l) => l.id === s.line?.id)
                    ?.trainType,
                })
            ),
            'id'
          )
        : uniqBy(
            stations.map((s) => s.line ?? null),
            'id'
          ).filter((l) => l !== null),
    [stations, stopStations, trainType?.lines]
  );

  return (
    <View style={styles.root}>
      <View
        style={[
          {
            backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : '#fff',
          },
          isTablet
            ? {
                width: '80%',
                maxHeight: '90%',
                shadowOpacity: 0.25,
                shadowColor: '#000',
                borderRadius: 16,
              }
            : {
                position: 'absolute',
                left: 0,
                top: 0,
                width: screenWidth,
                height: screenHeight,
              },
        ]}
      >
        <ScrollView contentContainerStyle={styles.scrollView}>
          <Heading>
            {isJapanese
              ? `${selectedLine?.nameShort} ${trainType?.name ?? ''}`
              : `${selectedLine?.nameRoman} ${trainType?.nameRoman ?? ''}`}
          </Heading>

          <View
            style={{
              width: '100%',
            }}
          >
            <View
              style={{
                paddingLeft: leftSafeArea || SAFE_AREA_FALLBACK,
                paddingRight: rightSafeArea || SAFE_AREA_FALLBACK,
              }}
            >
              <Typography
                style={{
                  fontSize: RFValue(14),
                  fontWeight: 'bold',
                  marginTop: 8,
                }}
              >
                {translate('allStops')}:
              </Typography>
              <Typography
                style={{
                  fontSize: RFValue(11),
                  marginTop: 8,
                  lineHeight: RFValue(14),
                }}
              >
                {!loading && stopStations.length
                  ? stopStations.map((s, i, a) =>
                      isJapanese ? (
                        <React.Fragment key={s.id}>
                          <Typography
                            style={[
                              afterFinalStations
                                .map((s) => s.groupId)
                                .includes(s.groupId)
                                ? {
                                    opacity: 0.5,
                                  }
                                : { fontWeight: 'bold' },
                            ]}
                          >
                            {s.name}
                          </Typography>
                          {a.length - 1 !== i ? ' ' : ''}
                        </React.Fragment>
                      ) : (
                        <React.Fragment key={s.id}>
                          <Typography
                            style={[
                              afterFinalStations
                                .map((s) => s.groupId)
                                .includes(s.groupId)
                                ? {
                                    opacity: 0.5,
                                  }
                                : { fontWeight: 'bold' },
                            ]}
                          >
                            {s.nameRoman}
                          </Typography>
                          {a.length - 1 !== i ? '  ' : ''}
                        </React.Fragment>
                      )
                    )
                  : `${translate('loadingAPI')}...`}
              </Typography>
              <Typography
                style={{
                  fontSize: RFValue(14),
                  fontWeight: 'bold',
                  marginTop: 16,
                }}
              >
                {translate('eachTrainTypes')}:
              </Typography>
            </View>
            <FlatList
              horizontal
              style={styles.trainTypeList}
              contentContainerStyle={{
                ...styles.trainTypeListContent,
                paddingLeft: leftSafeArea || SAFE_AREA_FALLBACK,
                paddingRight: rightSafeArea || SAFE_AREA_FALLBACK,
              }}
              data={trainTypeLines}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TrainTypeItem
                  outOfLineRange={afterFinalLines
                    .map((l) => l.id)
                    .includes(item.id)}
                  line={item}
                />
              )}
            />

            {fromRouteListModal && (
              <View
                style={{
                  ...styles.enableTerminusSwitchContainer,
                  paddingLeft: leftSafeArea || SAFE_AREA_FALLBACK,
                  paddingRight: rightSafeArea || SAFE_AREA_FALLBACK,
                }}
              >
                {isLEDTheme ? (
                  <LEDThemeSwitch
                    style={{ marginRight: 8 }}
                    value={asTerminus}
                    onValueChange={() => setAsTerminus((prev) => !prev)}
                  />
                ) : (
                  <Switch
                    style={{ marginRight: 8 }}
                    value={asTerminus}
                    onValueChange={() => setAsTerminus((prev) => !prev)}
                    ios_backgroundColor={'#fff'}
                  />
                )}

                <Typography style={styles.enableTerminusText}>
                  {translate('setTerminusText', {
                    stationName:
                      (isJapanese
                        ? finalStation?.name
                        : finalStation?.nameRoman) ?? '',
                  })}
                </Typography>
              </View>
            )}
          </View>

          <View style={styles.buttons}>
            <Button
              color={isLEDTheme ? undefined : '#008ffe'}
              onPress={() => onConfirmed(trainType ?? undefined, asTerminus)}
              disabled={loading || disabled}
            >
              {translate('submit')}
            </Button>
            <Button color={isLEDTheme ? undefined : '#333'} onPress={onClose}>
              {translate('cancel')}
            </Button>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

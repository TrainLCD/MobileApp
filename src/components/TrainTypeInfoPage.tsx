import type { ConnectError } from '@connectrpc/connect';
import { useAtom } from 'jotai';
import uniqBy from 'lodash/uniqBy';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LED_THEME_BG_COLOR, NUMBERING_ICON_SIZE } from '~/constants';
import { Line, type Station, type TrainType } from '~/gen/proto/stationapi_pb';
import { useCurrentStation, useGetLineMark, useThemeStore } from '~/hooks';
import { APP_THEME } from '~/models/Theme';
import navigationState from '~/store/atoms/navigation';
import { isJapanese, translate } from '~/translation';
import dropEitherJunctionStation from '~/utils/dropJunctionStation';
import getIsPass from '~/utils/isPass';
import isTablet from '~/utils/isTablet';
import { RFValue } from '~/utils/rfValue';
import Button from './Button';
import { Heading } from './Heading';
import LEDThemeSwitch from './LEDThemeSwitch';
import TransferLineMark from './TransferLineMark';
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 24,
  },
  contentView: {
    width: '100%',
    paddingVertical: 24,
    borderRadius: 8,
    minHeight: 256,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 16,
    marginTop: 24,
  },
  switchContainer: {
    flexDirection: 'row',
    marginTop: 16,
    marginHorizontal: 24,
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
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: 2,
    marginRight: 6,
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
  }: {
    line: Line | null;
    outOfLineRange: boolean;
  }) => {
    const isLEDTheme = useThemeStore((st) => st === APP_THEME.LED);
    const getLineMark = useGetLineMark();

    const lineMark = useMemo(
      () => line && getLineMark({ line }),
      [getLineMark, line]
    );

    if (!line) {
      return null;
    }

    return (
      <View
        style={[
          styles.trainTypeItemContainer,
          outOfLineRange && { opacity: 0.5 },
        ]}
        key={line.id}
      >
        {lineMark ? (
          <TransferLineMark
            line={line}
            mark={lineMark}
            size={NUMBERING_ICON_SIZE.SMALL}
            withDarkTheme={isLEDTheme}
          />
        ) : (
          <View
            style={{
              ...styles.colorIndicator,
              backgroundColor: line?.color ?? '#000000',
            }}
          />
        )}

        <Typography style={styles.trainTypeLineName}>
          {(isJapanese ? line.nameShort : line.nameRoman) ?? ''}:{' '}
        </Typography>
        <Typography
          style={{
            ...styles.lineTrainTypeName,
            color: line.trainType?.color ?? '#000000',
          }}
        >
          {isJapanese
            ? (line.trainType?.name ?? '普通/各駅停車')
            : (line.trainType?.nameRoman ?? 'Local')}
        </Typography>
      </View>
    );
  }
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

  const [{ autoModeEnabled }, setNavigationState] = useAtom(navigationState);

  const { left: leftSafeArea, right: rightSafeArea } = useSafeAreaInsets();

  const stopStations = useMemo(() => {
    const stops = dropEitherJunctionStation(stations)
      .filter((s) => !getIsPass(s))
      .filter((s) => s !== undefined);

    if (!fromRouteListModal) {
      return stops;
    }

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
  }, [
    stations,
    currentStation?.groupId,
    finalStation?.groupId,
    fromRouteListModal,
  ]);

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
    <Pressable style={styles.root} onPress={onClose}>
      <Pressable
        style={[
          styles.contentView,
          {
            backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : '#fff',
          },
          isTablet && {
            width: '80%',
            maxHeight: '90%',
            shadowOpacity: 0.25,
            shadowColor: '#000',
            borderRadius: 16,
          },
        ]}
      >
        <Heading>
          {isJapanese
            ? `${trainType?.line?.nameShort ?? ''} ${trainType?.name ?? ''}`
            : `${trainType?.line?.nameRoman ?? ''} ${trainType?.nameRoman ?? ''}`}
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
            <View style={styles.switchContainer}>
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

          <View style={styles.switchContainer}>
            {isLEDTheme ? (
              <LEDThemeSwitch
                style={{ marginRight: 8 }}
                value={autoModeEnabled}
                onValueChange={() =>
                  setNavigationState((prev) => ({
                    ...prev,
                    autoModeEnabled: !prev.autoModeEnabled,
                  }))
                }
              />
            ) : (
              <Switch
                style={{ marginRight: 8 }}
                value={autoModeEnabled}
                onValueChange={() =>
                  setNavigationState((prev) => ({
                    ...prev,
                    autoModeEnabled: !prev.autoModeEnabled,
                  }))
                }
                ios_backgroundColor={'#fff'}
              />
            )}

            <Typography style={styles.enableTerminusText}>
              {translate('setAutoModeText')}
            </Typography>
          </View>

          <View style={styles.buttons}>
            <Button
              onPress={() => onConfirmed(trainType ?? undefined, asTerminus)}
              disabled={loading || disabled}
            >
              {translate('submit')}
            </Button>
            <Button onPress={onClose}>{translate('cancel')}</Button>
          </View>
        </View>
      </Pressable>
    </Pressable>
  );
};

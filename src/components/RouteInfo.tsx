import type { ConnectError } from '@connectrpc/connect';
import uniqBy from 'lodash/uniqBy';
import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { LED_THEME_BG_COLOR, NUMBERING_ICON_SIZE } from '~/constants';
import { Line, type Station, type TrainType } from '~/gen/proto/stationapi_pb';
import { useCurrentStation, useGetLineMark, useThemeStore } from '~/hooks';
import { APP_THEME } from '~/models/Theme';
import { isJapanese, translate } from '~/translation';
import dropEitherJunctionStation from '~/utils/dropJunctionStation';
import getIsPass from '~/utils/isPass';
import isTablet from '~/utils/isTablet';
import { RFValue } from '~/utils/rfValue';
import Button from './Button';
import { Heading } from './Heading';
import TransferLineMark from './TransferLineMark';
import Typography from './Typography';

type Props = {
  trainType: TrainType | null;
  finalStation?: Station;
  stations: Station[];
  loading: boolean;
  error: ConnectError | null;
  routeName: string;
  onClose: () => void;
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 24,
  },
  heading: {
    fontSize: RFValue(14),
    fontWeight: 'bold',
    marginTop: 24,
  },
  contentView: {
    width: '100%',
    paddingVertical: 24,
    borderRadius: 8,
    minHeight: 256,
  },
  stops: {
    fontSize: RFValue(11),
    marginTop: 8,
    lineHeight: RFValue(16),
  },
  buttons: {
    marginTop: 32,
    alignSelf: 'center',
  },
  switchContainer: {
    flexDirection: 'row',
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
    rowGap: 8,
    columnGap: 48,
  },
  trainTypeItemContainer: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  routeName: {
    textAlign: 'left',
  },
  contentContainer: {
    marginHorizontal: 24,
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

const SavedItem = React.memo(
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

export const RouteInfo: React.FC<Props> = ({
  trainType,
  finalStation,
  stations,
  loading,
  error: _error,
  routeName,
  onClose,
}: Props) => {
  const currentStation = useCurrentStation();

  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED);

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

    if (curIndex === -1 || finalIndex === -1) {
      return uniqBy(stops, 'id');
    }

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

          if (finalIndex === -1 || !sta.line || idx < finalIndex) {
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

    if (finalIndex === -1) {
      return [];
    }
    return stopStations.slice(finalIndex + 1, stopStations.length);
  }, [stopStations, finalStation]);

  const trainTypeLines = useMemo(() => {
    if (trainType?.lines.length) {
      const mapped = stopStations
        .map((s) => {
          if (!s.line) return null;
          const tt = trainType.lines.find(
            (l) => l.id === s.line?.id
          )?.trainType;
          return new Line({ ...s.line, trainType: tt });
        })
        .filter((l): l is Line => l !== null);
      return uniqBy(mapped, 'id');
    }
    return uniqBy(
      stations.map((s) => s.line ?? null),
      'id'
    ).filter((l): l is Line => l !== null);
  }, [stations, stopStations, trainType?.lines]);

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
            shadowColor: '#333',
            borderRadius: 16,
          },
        ]}
      >
        <View style={styles.contentContainer}>
          <Heading style={styles.routeName}>{routeName}</Heading>

          <Typography style={styles.heading}>
            {translate('allStops')}:
          </Typography>

          {loading ? (
            <SkeletonPlaceholder borderRadius={4} speed={1500}>
              <SkeletonPlaceholder.Item
                width="100%"
                height={64}
                style={styles.stops}
              />
            </SkeletonPlaceholder>
          ) : (
            <Typography style={styles.stops}>
              {stopStations.map((s, i, a) =>
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
              )}
            </Typography>
          )}

          <Typography style={styles.heading}>
            {translate('eachTrainTypes')}:
          </Typography>

          {loading ? (
            <SkeletonPlaceholder borderRadius={4} speed={1500}>
              <SkeletonPlaceholder.Item
                width="100%"
                height={48}
                style={styles.trainTypeList}
              />
            </SkeletonPlaceholder>
          ) : (
            <FlatList
              horizontal
              style={styles.trainTypeList}
              contentContainerStyle={styles.trainTypeListContent}
              data={trainTypeLines}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <SavedItem
                  outOfLineRange={afterFinalLines
                    .map((l) => l.id)
                    .includes(item.id)}
                  line={item}
                />
              )}
            />
          )}
        </View>

        <View style={styles.buttons}>
          <Button onPress={onClose}>OK</Button>
        </View>
      </Pressable>
    </Pressable>
  );
};

import { useLazyQuery } from '@apollo/client/react';
import { useSetAtom } from 'jotai';
import type React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LED_THEME_BG_COLOR } from '~/constants';
import type { Route, Station, TrainType } from '~/@types/graphql';
import { GET_STATION_TRAIN_TYPES } from '~/lib/graphql/queries';
import { useCurrentStation, useThemeStore } from '~/hooks';

type GetStationTrainTypesData = {
  stationTrainTypes: TrainType[];
};

type GetStationTrainTypesVariables = {
  stationId: number;
};
import { APP_THEME } from '~/models/Theme';
import { isJapanese, translate } from '~/translation';
import lineState from '../store/atoms/line';
import isTablet from '../utils/isTablet';
import FAB from './FAB';
import { Heading } from './Heading';
import Loading from './Loading';
import { RouteList } from './RouteList';
import { TrainTypeInfoPage } from './TrainTypeInfoPage';

type Props = {
  finalStation: Station;
  routes: Route[];
  visible: boolean;
  isRoutesLoading: boolean;
  isTrainTypesLoading: boolean;
  error: Error | null;
  onClose: () => void;
  onSelect: (route: Route | undefined, asTerminus: boolean) => void;
};

const styles = StyleSheet.create({
  root: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flexOne: { flex: 1 },
  listContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  innerHeader: {
    marginVertical: 16,
  },
  modalContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: '100%',
    height: '100%',
  },
  modalView: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 12,
  },
  loading: { marginTop: 12 },
});

const _SAFE_AREA_FALLBACK = 32;

export const RouteListModal: React.FC<Props> = ({
  finalStation,
  routes,
  visible,
  isRoutesLoading,
  isTrainTypesLoading,
  onClose,
  onSelect,
}: Props) => {
  const [trainTypeInfoPageVisible, setTrainTypeInfoPageVisible] =
    useState(false);
  const [selectedRoute, setSelectedRoute] = useState<Route>();
  const [selectedTrainType, setSelectedTrainType] = useState<TrainType>();

  const setLineState = useSetAtom(lineState);

  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED);
  const currentStation = useCurrentStation();

  const [
    fetchTrainTypes,
    {
      data: trainTypesData,
      loading: fetchTrainTypesLoading,
      error: fetchTrainTypesError,
    },
  ] = useLazyQuery<GetStationTrainTypesData, GetStationTrainTypesVariables>(
    GET_STATION_TRAIN_TYPES
  );

  const fetchTrainTypesStatus = fetchTrainTypesLoading ? 'pending' : 'success';
  const trainTypes = trainTypesData?.stationTrainTypes ?? [];

  const trainType = useMemo(
    () =>
      trainTypes.find(
        (tt: TrainType) => tt.groupId === selectedTrainType?.groupId
      ) ?? null,
    [selectedTrainType?.groupId, trainTypes]
  );

  const handleSelect = useCallback(
    (route: Route | undefined) => {
      if (!route) return;
      const selectedStop = (route.stops ?? []).find(
        (s) => s.groupId === currentStation?.groupId
      );
      if (!selectedStop?.id) return;

      setTrainTypeInfoPageVisible(true);
      setLineState((prev) => ({
        ...prev,
        selectedLine: selectedStop.line ?? null,
      }));
      setSelectedRoute(route);
      setSelectedTrainType(selectedStop.trainType ?? undefined);
      fetchTrainTypes({ variables: { stationId: selectedStop.id } });
    },
    [currentStation?.groupId, fetchTrainTypes, setLineState]
  );

  if (trainTypeInfoPageVisible) {
    return (
      <TrainTypeInfoPage
        trainType={trainType}
        error={fetchTrainTypesError ?? null}
        loading={fetchTrainTypesStatus === 'pending'}
        disabled={isTrainTypesLoading}
        finalStation={finalStation}
        stations={selectedRoute?.stops ?? []}
        onClose={() => setTrainTypeInfoPageVisible(false)}
        onConfirmed={(_, asTerminus) =>
          onSelect(selectedRoute, asTerminus ?? false)
        }
        fromRouteListModal
      />
    );
  }

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
      supportedOrientations={['portrait', 'landscape']}
    >
      <View style={styles.modalContainer}>
        <SafeAreaView
          style={[
            styles.modalView,
            {
              backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : '#fff',
            },
            isTablet
              ? {
                  width: '80%',
                  maxHeight: '90%',
                  shadowOpacity: 0.25,
                  shadowColor: '#333',
                  borderRadius: 16,
                }
              : {
                  width: '100%',
                  height: '100%',
                  // paddingLeft: leftSafeArea || SAFE_AREA_FALLBACK,
                  // paddingRight: rightSafeArea || SAFE_AREA_FALLBACK,
                },
          ]}
        >
          <View style={styles.root}>
            <View style={styles.innerHeader}>
              <Heading>
                {translate('routeListTitle', {
                  stationName: isJapanese
                    ? finalStation.name || ''
                    : finalStation.nameRoman || '',
                })}
              </Heading>
            </View>
            <View style={styles.listContainer}>
              {isRoutesLoading ? (
                <Loading message={translate('loadingAPI')} />
              ) : (
                <View
                  style={[
                    styles.flexOne,
                    { opacity: isTrainTypesLoading ? 0.5 : 1 },
                  ]}
                >
                  <RouteList
                    routes={routes}
                    destination={finalStation}
                    onSelect={handleSelect}
                    loading={isTrainTypesLoading}
                  />
                </View>
              )}
            </View>
          </View>
        </SafeAreaView>
        <FAB onPress={onClose} icon="close" />
      </View>
    </Modal>
  );
};

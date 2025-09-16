import type { ConnectError } from '@connectrpc/connect';
import { useMutation } from '@connectrpc/connect-query';
import { useSetAtom } from 'jotai';
import type React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { Modal, SafeAreaView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Route, Station, TrainType } from '~/gen/proto/stationapi_pb';
import { getTrainTypesByStationId } from '~/gen/proto/stationapi-StationAPI_connectquery';
import { useCurrentStation, useThemeStore } from '~/hooks';
import { LED_THEME_BG_COLOR } from '../constants';
import { APP_THEME } from '../models/Theme';
import lineState from '../store/atoms/line';
import { isJapanese, translate } from '../translation';
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
  error: ConnectError | null;
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

const SAFE_AREA_FALLBACK = 32;

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
  const { left: leftSafeArea, right: rightSafeArea } = useSafeAreaInsets();
  const currentStation = useCurrentStation();

  const {
    data: trainTypes,
    mutate: fetchTrainTypes,
    status: fetchTrainTypesStatus,
    error: fetchTrainTypesError,
  } = useMutation(getTrainTypesByStationId);

  const trainType = useMemo(
    () =>
      trainTypes?.trainTypes.find(
        (tt) => tt.groupId === selectedTrainType?.groupId
      ) ?? null,
    [selectedTrainType?.groupId, trainTypes?.trainTypes]
  );

  const handleSelect = useCallback(
    (route: Route | undefined) => {
      setTrainTypeInfoPageVisible(true);
      setLineState((prev) => ({
        ...prev,
        selectedLine:
          route?.stops?.find((s) => s.groupId === currentStation?.groupId)
            ?.line ?? null,
      }));
      setSelectedRoute(route);
      setSelectedTrainType(
        route?.stops.find((s) => s.groupId === currentStation?.groupId)
          ?.trainType
      );
      fetchTrainTypes({
        stationId: route?.stops.find(
          (s) => s.groupId === currentStation?.groupId
        )?.id,
      });
    },
    [currentStation?.groupId, fetchTrainTypes, setLineState]
  );

  if (trainTypeInfoPageVisible) {
    return (
      <TrainTypeInfoPage
        trainType={trainType}
        error={fetchTrainTypesError}
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
                  paddingLeft: leftSafeArea || SAFE_AREA_FALLBACK,
                  paddingRight: rightSafeArea || SAFE_AREA_FALLBACK,
                },
          ]}
        >
          <View style={styles.root}>
            <View style={styles.innerHeader}>
              <Heading>
                {translate('routeListTitle', {
                  stationName: isJapanese
                    ? finalStation.name
                    : (finalStation.nameRoman ?? ''),
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

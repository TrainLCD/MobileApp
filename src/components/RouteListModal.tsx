import type { ConnectError } from '@connectrpc/connect';
import { useMutation } from '@connectrpc/connect-query';
import type React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { Modal, SafeAreaView, StyleSheet, View } from 'react-native';
import { useSetRecoilState } from 'recoil';
import { getTrainTypesByStationId } from '../../gen/proto/stationapi-StationAPI_connectquery';
import type { Route, Station, TrainType } from '../../gen/proto/stationapi_pb';
import { LED_THEME_BG_COLOR } from '../constants';
import { useCurrentStation } from '../hooks/useCurrentStation';
import { useThemeStore } from '../hooks/useThemeStore';
import { APP_THEME } from '../models/Theme';
import lineState from '../store/atoms/line';
import { translate } from '../translation';
import isTablet from '../utils/isTablet';
import FAB from './FAB';
import Heading from './Heading';
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
  modalContainer: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    flex: 1,
  },
  heading: { marginVertical: 24 },
  modalView: { flex: 1, paddingHorizontal: 16 },
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

  const setLineState = useSetRecoilState(lineState);

  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED);
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
      supportedOrientations={['landscape', 'portrait']}
    >
      <SafeAreaView
        style={[
          styles.modalContainer,
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
            : { flex: 1 },
        ]}
      >
        <View style={styles.modalView}>
          <Heading style={styles.heading}>
            {translate('trainTypeSettings')}
          </Heading>

          {isRoutesLoading ? (
            <Loading message={translate('loadingAPI')} />
          ) : (
            <View style={{ flex: 1, opacity: isTrainTypesLoading ? 0.5 : 1 }}>
              <RouteList
                routes={routes}
                onSelect={handleSelect}
                loading={isTrainTypesLoading}
              />
            </View>
          )}
        </View>
      </SafeAreaView>
      <FAB onPress={onClose} icon="close" />
    </Modal>
  );
};

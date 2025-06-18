import { useMutation } from '@connectrpc/connect-query';
import { StackActions, useNavigation } from '@react-navigation/native';
import getDistance from 'geolib/es/getDistance';
import { useAtomValue, useSetAtom } from 'jotai';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, TouchableOpacity, View } from 'react-native';
import { SEARCH_STATION_RESULT_LIMIT } from 'react-native-dotenv';
import CircleButton from '~/components/CircleButton';
import { RoutesModal } from '~/components/RoutesModal';
import { SearchableModal } from '~/components/SearchableModal';
import { ToggleButton } from '~/components/ToggleButton';
import Typography from '~/components/Typography';
import { Station, type TrainType } from '~/gen/proto/stationapi_pb';
import {
  getRoutes,
  getStationsByName,
} from '~/gen/proto/stationapi-StationAPI_connectquery';
import {
  useDebounce,
  useFetchCurrentLocationOnce,
  useFetchNearbyStation,
  useLocationStore,
  useThemeStore,
} from '~/hooks';
import type { LineDirection } from '~/models/Bound';
import lineState from '~/store/atoms/line';
import navigationState from '~/store/atoms/navigation';
import stationState from '~/store/atoms/station';
import { isJapanese, translate } from '~/translation';
import { groupStations } from '~/utils/groupStations';
import { getSettingsThemes } from '~/utils/theme';

const HomeScreen: React.FC = () => {
  const setStationState = useSetAtom(stationState);
  const setLineState = useSetAtom(lineState);
  const setNavigationState = useSetAtom(navigationState);

  const navigation = useNavigation();

  const { autoModeEnabled } = useAtomValue(navigationState);
  const theme = useThemeStore();
  const currentThemeLabel = useMemo(() => {
    const themes = getSettingsThemes();
    return themes.find((t) => t.value === theme)?.label ?? '';
  }, [theme]);

  const { fetchByCoords, error: nearbyStationFetchError } =
    useFetchNearbyStation();
  const { fetchCurrentLocation } = useFetchCurrentLocationOnce();
  const {
    data: byNameData,
    error: byNameError,
    mutate: fetchByName,
  } = useMutation(getStationsByName);
  const {
    data: routesData,
    error: routesError,
    status: routesFetchStatus,
    mutateAsync: fetchRoutes,
  } = useMutation(getRoutes);

  const currentLocation = useLocationStore();

  const [closestStation, setClosestStation] = useState<Station | null>(null);
  const [departureStation, setDepartureStation] = useState<Station | null>(
    null
  );
  const [destinationStation, setDestinationStation] = useState<Station | null>(
    null
  );

  const [isSearchableModalOpen, setIsSearchableModalOpen] = useState(false);
  const [searchableModalType, setSearchableModalType] = useState<'from' | 'to'>(
    'from'
  );

  const [isTrainTypeModalOpen, setIsTrainTypeModalOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  const handleDismissSearchableModal = () => {
    setIsSearchableModalOpen(false);
    setSearchQuery('');
  };

  const handleDismissTrainTypeModal = () => {
    setIsTrainTypeModalOpen(false);
  };
  const handleSelectTrainType = (
    trainType: TrainType | null,
    stations: Station[]
  ) => {
    if (!trainType) {
      return;
    }

    handleDismissTrainTypeModal();

    setupRoute({ trainType, stations });
  };

  useEffect(() => {
    const init = async () => {
      const pos = await fetchCurrentLocation(true);
      if (!pos) {
        return;
      }
      useLocationStore.setState(pos);
      const data = await fetchByCoords({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        limit: 1,
      });

      const sta = data.stations[0];
      setClosestStation(
        (prev) =>
          prev ??
          new Station({
            ...sta,
            distance:
              (currentLocation &&
                getDistance(
                  {
                    lat: currentLocation.coords.latitude,
                    lon: currentLocation.coords.longitude,
                  },
                  { lat: sta.latitude, lon: sta.longitude }
                )) ??
              0,
          }) ??
          null
      );
    };
    init();
  }, [fetchByCoords, fetchCurrentLocation, currentLocation]);

  useEffect(() => {
    const error = nearbyStationFetchError || byNameError || routesError;
    if (error) {
      console.error(error);
      Alert.alert(translate('error'), error.message);
    }
  }, [nearbyStationFetchError, byNameError, routesError]);

  const setupRoute = useCallback(
    async ({
      stations,
      trainType,
    }: {
      stations: Station[];
      trainType: TrainType | null;
    }) => {
      try {
        const station = stations[0];

        const direction: LineDirection | null = (() => {
          const fromIdx = stations.findIndex(
            (s) => s.groupId === (departureStation ?? closestStation)?.groupId
          );
          const toIdx = stations.findIndex(
            (s) => s.groupId === destinationStation?.groupId
          );
          if (fromIdx === -1 || toIdx === -1) {
            return null;
          }
          return fromIdx < toIdx ? 'INBOUND' : 'OUTBOUND';
        })();

        if (!direction) {
          return;
        }

        setNavigationState((prev) => ({
          ...prev,
          trainType,
          stationForHeader: station,
        }));
        setLineState((prev) => ({
          ...prev,
          selectedLine: station.line ?? null,
        }));
        setStationState((prev) => ({
          ...prev,
          station,
          stations,
          selectedBound: destinationStation,
          selectedDirection: direction,
        }));

        navigation.dispatch(
          StackActions.replace('MainStack', { screen: 'Main' })
        );
      } catch (err) {
        console.error(err);
        Alert.alert(translate('error'), (err as Error).message);
      }
    },
    [
      setStationState,
      setNavigationState,
      closestStation,
      departureStation,
      destinationStation,
      navigation,
      setLineState,
    ]
  );

  const groupedStations = useMemo(
    () =>
      searchQuery.trim().length
        ? groupStations(byNameData?.stations ?? [])
        : [],
    [byNameData?.stations, searchQuery]
  );

  const fromStationName = useMemo(() => {
    if (!departureStation) {
      if (closestStation) {
        return isJapanese ? closestStation?.name : closestStation?.nameRoman;
      }

      return translate('notSelected');
    }

    return isJapanese ? departureStation?.name : departureStation?.nameRoman;
  }, [departureStation, closestStation]);

  const toStationName = useMemo(() => {
    if (!destinationStation) {
      return translate('notSelected');
    }

    return isJapanese
      ? destinationStation?.name
      : destinationStation?.nameRoman;
  }, [destinationStation]);

  const debounce = useDebounce(1000);

  useEffect(() => {
    if (!searchQuery.trim().length) {
      return;
    }

    debounce(() => {
      fetchByName({
        stationName: searchQuery.trim(),
        limit: Number(SEARCH_STATION_RESULT_LIMIT),
      });
    });
  }, [searchQuery, fetchByName, debounce]);

  const isDepatureDisabled = useMemo(() => {
    return (
      !(departureStation ?? closestStation) ||
      !destinationStation ||
      routesFetchStatus === 'pending'
    );
  }, [departureStation, closestStation, destinationStation, routesFetchStatus]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 32,
        paddingHorizontal: 16,
      }}
    >
      <Typography style={{ fontSize: 16, fontWeight: 'bold' }}>
        {translate('selectDestinationTextForHome')}
      </Typography>

      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}
        onPress={() => {
          setSearchableModalType('from');
          setIsSearchableModalOpen(true);
        }}
      >
        <Typography
          style={{ fontSize: 32, fontWeight: 'bold', color: '#008ffe' }}
        >
          {fromStationName}
        </Typography>
        <Typography style={{ fontWeight: 'bold', fontSize: 16 }}>
          から
        </Typography>
      </TouchableOpacity>
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}
        onPress={() => {
          setSearchableModalType('to');
          setIsSearchableModalOpen(true);
        }}
      >
        <Typography
          style={{ fontSize: 32, fontWeight: 'bold', color: '#008ffe' }}
        >
          {toStationName}
        </Typography>
        <Typography style={{ fontWeight: 'bold', fontSize: 16 }}>
          まで
        </Typography>
      </TouchableOpacity>

      <CircleButton
        style={{ backgroundColor: '#008ffe', marginTop: 40 }}
        onPress={async () => {
          if ((!departureStation && !closestStation) || !destinationStation) {
            return;
          }

          const { routes } = await fetchRoutes({
            fromStationGroupId: (departureStation ?? closestStation)?.groupId,
            toStationGroupId: destinationStation?.groupId,
          });

          if (
            routes &&
            (departureStation ?? closestStation)?.groupId !==
              destinationStation?.groupId
          ) {
            const isSingleRoute = routes.length === 1;
            if (isSingleRoute) {
              setupRoute({
                stations: routes[0].stops ?? [],
                trainType: routes[0].stops[0].trainType ?? null,
              });
              return;
            }

            setIsTrainTypeModalOpen(true);
          }
        }}
        disabled={isDepatureDisabled}
      >
        {translate('departure')}
      </CircleButton>

      {isDepatureDisabled ? (
        <Typography style={{ fontSize: 16, fontWeight: 'bold' }}>
          {routesFetchStatus === 'pending'
            ? translate('routesFetching')
            : translate('selectDestinationTextForHomeError')}
        </Typography>
      ) : null}

      <View
        style={{
          width: '50%',
          height: 1,
          backgroundColor: 'black',
          opacity: 0.1,
        }}
      />

      <View style={{ flexDirection: 'row', gap: 32, marginTop: 8 }}>
        <ToggleButton
          isActive={autoModeEnabled}
          icon="robot"
          onPress={() => {
            setNavigationState((prev) => ({
              ...prev,
              autoModeEnabled: !autoModeEnabled,
            }));
          }}
        >
          {translate('autoModeSettings')}
        </ToggleButton>
        <ToggleButton
          isActive
          icon="brush-variant"
          value={currentThemeLabel}
          onPress={() => {
            navigation.navigate('ThemeSettings' as never);
          }}
        >
          {translate('selectThemeTitle')}
        </ToggleButton>
      </View>

      <SearchableModal
        open={isSearchableModalOpen}
        title={
          searchableModalType === 'from'
            ? translate('searchFromStationTitle')
            : translate('searchToStationTitle')
        }
        searchQuery={searchQuery}
        stations={groupedStations}
        closestStation={closestStation}
        onUpdateSearchQuery={setSearchQuery}
        onDismiss={handleDismissSearchableModal}
        onSelectStation={(station) => {
          if (searchableModalType === 'from') {
            setDepartureStation(station);
          } else {
            setDestinationStation(station);
          }
          handleDismissSearchableModal();
        }}
      />

      <RoutesModal
        open={isTrainTypeModalOpen}
        title={translate('routeListTitle', {
          stationName:
            (isJapanese
              ? destinationStation?.name
              : destinationStation?.nameRoman) ?? '',
        })}
        routes={routesData?.routes ?? []}
        onDismiss={handleDismissTrainTypeModal}
        onSelectTrainType={handleSelectTrainType}
        departureStation={departureStation ?? closestStation}
      />
    </View>
  );
};

export default React.memo(HomeScreen);

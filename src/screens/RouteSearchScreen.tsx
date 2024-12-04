import { useNavigation } from '@react-navigation/native'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  TextInput,
  TextInputChangeEventData,
  TextInputKeyPressEventData,
  View,
} from 'react-native'
import { RFValue } from '../utils/rfValue'

import { useMutation, useQuery } from '@connectrpc/connect-query'
import { SEARCH_STATION_RESULT_LIMIT } from 'react-native-dotenv'
import { useSetRecoilState } from 'recoil'
import {
  getRoutes,
  getStationsByName,
} from '../../gen/proto/stationapi-StationAPI_connectquery'
import { Route, Station } from '../../gen/proto/stationapi_pb'
import FAB from '../components/FAB'
import Heading from '../components/Heading'
import { RouteListModal } from '../components/RouteListModal'
import { StationList } from '../components/StationList'
import { FONTS } from '../constants'
import { useCurrentStation } from '../hooks/useCurrentStation'
import { useThemeStore } from '../hooks/useThemeStore'
import { useTrainTypeStations } from '../hooks/useTrainTypeStations'
import { LineDirection } from '../models/Bound'
import { APP_THEME } from '../models/Theme'
import lineState from '../store/atoms/line'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import { translate } from '../translation'
import { groupStations } from '../utils/groupStations'

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 48,
    paddingVertical: 12,
    flex: 1,
    alignItems: 'center',
  },
  settingItem: {
    width: '65%',
    height: '100%',
    alignItems: 'center',
  },
  heading: {
    marginBottom: 24,
  },
  stationNameInput: {
    borderWidth: 1,
    padding: 12,
    width: '100%',
    fontSize: RFValue(14),
  },
  emptyText: {
    fontSize: RFValue(16),
    textAlign: 'center',
    marginTop: 12,
    fontWeight: 'bold',
  },
})

const RouteSearchScreen = () => {
  const [query, setQuery] = useState('')
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)

  const navigation = useNavigation()
  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED)

  const [isRouteListModalVisible, setIsRouteListModalVisible] = useState(false)
  const setStationState = useSetRecoilState(stationState)
  const setLineState = useSetRecoilState(lineState)
  const setNavigationState = useSetRecoilState(navigationState)

  const currentStation = useCurrentStation()
  const {
    fetchStations: fetchTrainTypeFromTrainTypeId,
    isLoading: isTrainTypesLoading,
    error: fetchTrainTypesError,
  } = useTrainTypeStations()

  const {
    data: byNameData,
    status: byNameLoadingStatus,
    mutate: fetchByName,
    error: byNameError,
  } = useMutation(getStationsByName)

  const {
    data: routesData,
    isLoading: isRoutesLoading,
    error: fetchRoutesError,
  } = useQuery(
    getRoutes,
    {
      fromStationGroupId: currentStation?.groupId,
      toStationGroupId: selectedStation?.groupId,
    },
    { enabled: !!currentStation && !!selectedStation }
  )

  const onPressBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack()
    }
  }, [navigation])

  const handleSubmit = useCallback(() => {
    if (!currentStation || !query.trim().length) {
      return
    }
    fetchByName({
      stationName: query.trim(),
      limit: Number(SEARCH_STATION_RESULT_LIMIT),
      fromStationGroupId: currentStation?.groupId,
    })
  }, [currentStation, fetchByName, query])

  useEffect(() => {
    if (byNameError) {
      Alert.alert(translate('errorTitle'), translate('apiErrorText'))
    }
  }, [byNameError])

  // NOTE: 今いる駅は出なくていい
  const groupedStations = useMemo(
    () =>
      groupStations(byNameData?.stations ?? []).filter(
        (sta) => sta.groupId != currentStation?.groupId
      ),
    [byNameData?.stations, currentStation?.groupId]
  )

  const handleStationPress = useCallback(
    async (stationFromSearch: Station) => {
      setLineState((prev) => ({
        ...prev,
        selectedLine: stationFromSearch.line ?? null,
      }))
      setSelectedStation(stationFromSearch)
      setIsRouteListModalVisible(true)
    },
    [setLineState]
  )

  const onKeyPress = useCallback(
    (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      if (e.nativeEvent.key === 'Enter') {
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  const onChange = useCallback(
    (e: NativeSyntheticEvent<TextInputChangeEventData>) => {
      setQuery(e.nativeEvent.text)
    },
    []
  )

  const handleSelect = useCallback(
    async (route: Route | undefined) => {
      const trainType = route?.stops.find(
        (s) => s.groupId === currentStation?.groupId
      )?.trainType

      if (!trainType?.id) {
        const direction: LineDirection =
          (route?.stops ?? []).findIndex(
            (s) => s.groupId === currentStation?.groupId
          ) <
          (route?.stops ?? []).findIndex(
            (s) => s.groupId === selectedStation?.groupId
          )
            ? 'INBOUND'
            : 'OUTBOUND'

        setStationState((prev) => ({
          ...prev,
          station,
          stations: route?.stops ?? [],
          selectedDirection: direction,
          selectedBound:
            direction === 'INBOUND'
              ? route?.stops[route.stops.length - 1] ?? null
              : route?.stops[0] ?? null,
        }))
        setNavigationState((prev) => ({ ...prev, stationForHeader: station }))
        navigation.navigate('MainStack', { screen: 'Main' })
        return
      }

      const data = await fetchTrainTypeFromTrainTypeId({
        lineGroupId: trainType.groupId,
      })

      const station =
        data.stations.find((s) => s.groupId === currentStation?.groupId) ?? null

      const direction: LineDirection =
        data.stations.findIndex((s) => s.groupId === currentStation?.groupId) <
        data.stations.findIndex((s) => s.groupId === selectedStation?.groupId)
          ? 'INBOUND'
          : 'OUTBOUND'

      setNavigationState((prev) => ({
        ...prev,
        trainType: station?.trainType ?? null,
        stationForHeader: station,
      }))
      setStationState((prev) => ({
        ...prev,
        station,
        stations: data.stations,
        selectedDirection: direction,
        selectedBound:
          direction === 'INBOUND'
            ? data.stations[data.stations.length - 1]
            : data.stations[0],
      }))
      navigation.navigate('MainStack', { screen: 'Main' })
    },
    [
      currentStation,
      fetchTrainTypeFromTrainTypeId,
      navigation,
      selectedStation?.groupId,
      setNavigationState,
      setStationState,
    ]
  )

  return (
    <>
      <View
        style={{
          ...styles.root,
          backgroundColor: isLEDTheme ? '#212121' : '#fff',
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.settingItem}
        >
          <Heading style={styles.heading}>
            {translate('routeSearchTitle')}
          </Heading>
          <TextInput
            placeholder={translate('searchDestinationPlaceholder')}
            value={query}
            style={{
              ...styles.stationNameInput,
              borderColor: isLEDTheme ? '#fff' : '#aaa',
              color: isLEDTheme ? '#fff' : '#000',
              fontFamily: isLEDTheme ? FONTS.JFDotJiskan24h : undefined,
            }}
            placeholderTextColor={isLEDTheme ? '#fff' : undefined}
            onChange={onChange}
            onSubmitEditing={handleSubmit}
            onKeyPress={onKeyPress}
          />
          {byNameLoadingStatus === 'pending' ? (
            <View
              style={{
                ...StyleSheet.absoluteFillObject,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <ActivityIndicator size="large" />
            </View>
          ) : (
            <StationList
              withoutTransfer
              fromRoutes
              data={groupedStations}
              onSelect={handleStationPress}
            />
          )}
        </KeyboardAvoidingView>
      </View>
      <FAB onPress={onPressBack} icon="close" disabled={isTrainTypesLoading} />
      <RouteListModal
        routes={routesData?.routes ?? []}
        visible={isRouteListModalVisible}
        isRoutesLoading={isRoutesLoading}
        isTrainTypesLoading={isTrainTypesLoading}
        error={fetchRoutesError || fetchTrainTypesError}
        onClose={() => setIsRouteListModalVisible(false)}
        onSelect={handleSelect}
      />
    </>
  )
}

export default React.memo(RouteSearchScreen)

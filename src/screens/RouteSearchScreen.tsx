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
import { RFValue } from 'react-native-responsive-fontsize'

import { SEARCH_STATION_RESULT_LIMIT } from 'react-native-dotenv'
import { useSetRecoilState } from 'recoil'
import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import {
  GetRouteRequest,
  GetStationsByNameRequest,
  Route,
  Station,
  TrainDirection,
  TrainType,
  TrainTypeKind,
} from '../../gen/proto/stationapi_pb'
import FAB from '../components/FAB'
import Heading from '../components/Heading'
import { RouteListModal } from '../components/RouteListModal'
import { StationList } from '../components/StationList'
import { FONTS } from '../constants'
import { useCurrentStation } from '../hooks/useCurrentStation'
import { useThemeStore } from '../hooks/useThemeStore'
import { grpcClient } from '../lib/grpc'
import { APP_THEME } from '../models/Theme'
import lineState from '../store/atoms/line'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import { translate } from '../translation'
import { groupStations } from '../utils/groupStations'
import getIsPass from '../utils/isPass'

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
    data: byNameData,
    isMutating: isByNameLoading,
    trigger: fetchByName,
    error: byNameError,
  } = useSWRMutation(
    [
      '/app.trainlcd.grpc/getStationsByName',
      query,
      SEARCH_STATION_RESULT_LIMIT,
    ],
    async ([, query, limit]) => {
      if (!query.length) {
        return
      }

      const trimmedQuery = query.trim()
      const req = new GetStationsByNameRequest({
        stationName: trimmedQuery,
        limit: Number(limit),
        fromStationGroupId: currentStation?.groupId,
      })
      const res = await grpcClient.getStationsByName(req)
      return res.stations
    }
  )

  const {
    data: routesData,
    isLoading: isRoutesLoading,
    error: fetchRoutesError,
  } = useSWR(
    ['/app.trainlcd.grpc/getRoutes', selectedStation?.groupId],
    async ([, toStationGroupId]) => {
      if (!currentStation) {
        return []
      }

      const req = new GetRouteRequest({
        fromStationGroupId: currentStation?.groupId,
        toStationGroupId,
      })
      const res = await grpcClient.getRoutes(req)

      return res.routes
    }
  )

  const withoutPassStationRoutes = useMemo(
    () =>
      routesData?.filter((route) =>
        // NOTE: 両方の駅どちらも停車する種別を探す
        route.stops
          .filter(
            (stop) =>
              stop.groupId === currentStation?.groupId ||
              stop.groupId === selectedStation?.groupId
          )
          .every((stop) => !getIsPass(stop, true))
      ) ?? [],
    [currentStation?.groupId, routesData, selectedStation?.groupId]
  )

  const onPressBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack()
      return
    }
    navigation.navigate('MainStack')
  }, [navigation])

  const handleSubmit = useCallback(() => fetchByName(), [fetchByName])

  useEffect(() => {
    if (byNameError) {
      Alert.alert(translate('errorTitle'), translate('apiErrorText'))
    }
  }, [byNameError])

  const foundStations = useMemo(() => byNameData ?? [], [byNameData])

  // NOTE: 今いる駅は出なくていい
  const groupedStations = useMemo(
    () =>
      groupStations(foundStations).filter(
        (sta) => sta.groupId != currentStation?.groupId
      ),
    [currentStation?.groupId, foundStations]
  )

  const handleStationPress = useCallback(
    (stationFromSearch: Station) => {
      const station = foundStations.find((s) => s.id === stationFromSearch.id)
      if (!station) {
        return
      }
      setSelectedStation(station)
      setIsRouteListModalVisible(true)
    },
    [foundStations]
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
    (route: Route) => {
      const matchedStation = route.stops.find(
        (s) => s.groupId === currentStation?.groupId
      )
      const line = matchedStation?.line
      const matchedStationIndex = route.stops.findIndex(
        (s) => s.groupId === matchedStation?.groupId
      )
      const boundStationIndex = route.stops.findIndex(
        (s) => s?.groupId === selectedStation?.groupId
      )
      const direction =
        matchedStationIndex < boundStationIndex ? 'INBOUND' : 'OUTBOUND'

      const stops =
        direction === 'INBOUND' ? route.stops : route.stops.slice().reverse()
      const currentStationIndex = stops.findIndex(
        (stop) => stop.groupId === currentStation?.groupId
      )
      const stopsAfterCurrentStation = stops.slice(currentStationIndex)

      if (line) {
        setStationState((prev) => ({
          ...prev,
          stations: stopsAfterCurrentStation,
        }))

        const trainTypes =
          withoutPassStationRoutes
            ?.map((route) =>
              route.stops.find(
                (stop) => stop.groupId === currentStation?.groupId
              )
            )
            .map((stop) => {
              if (stop?.trainType) {
                return stop?.trainType
              }

              return new TrainType({
                id: 0,
                typeId: 0,
                groupId: 0,
                name: '普通/各駅停車',
                nameKatakana: '',
                nameRoman: 'Local',
                nameChinese: '慢车/每站停车',
                nameKorean: '보통/각역정차',
                color: '',
                lines: stop?.lines,
                direction: TrainDirection.Both,
                kind: TrainTypeKind.Default,
              })
            }) ?? []

        setNavigationState((prev) => ({
          ...prev,
          trainType: matchedStation.trainType ?? null,
          fetchedTrainTypes: trainTypes,
          leftStations: [],
          fromBuilder: true,
        }))
        setLineState((prev) => ({
          ...prev,
          selectedLine: line,
        }))
        navigation.navigate('SelectBound')
      }
    },
    [
      currentStation?.groupId,
      navigation,
      routesData,
      selectedStation?.groupId,
      setLineState,
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
            placeholder={translate('searchByStationNamePlaceholder')}
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
          {isByNameLoading ? (
            <ActivityIndicator size="large" />
          ) : (
            <StationList
              withoutTransfer
              data={groupedStations}
              onSelect={handleStationPress}
            />
          )}
        </KeyboardAvoidingView>
      </View>
      <FAB onPress={onPressBack} icon="close" />
      {routesData?.length ? (
        <RouteListModal
          visible={isRouteListModalVisible}
          routes={withoutPassStationRoutes}
          loading={isRoutesLoading}
          error={fetchRoutesError}
          onClose={() => setIsRouteListModalVisible(false)}
          onSelect={handleSelect}
        />
      ) : null}
    </>
  )
}

export default React.memo(RouteSearchScreen)

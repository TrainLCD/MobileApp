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
  Station,
  TrainType,
} from '../../gen/proto/stationapi_pb'
import FAB from '../components/FAB'
import Heading from '../components/Heading'
import { RouteListModal } from '../components/RouteListModal'
import { StationList } from '../components/StationList'
import { FONTS } from '../constants'
import { useCurrentStation } from '../hooks/useCurrentStation'
import { useStationList } from '../hooks/useStationList'
import { useThemeStore } from '../hooks/useThemeStore'
import { useTrainTypeStations } from '../hooks/useTrainTypeStations'
import { grpcClient } from '../lib/grpc'
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
  const { fetchStations: fetchTrainTypeFromTrainTypeId } =
    useTrainTypeStations()
  const { trainTypes, fetchTrainTypes } = useStationList()

  const reachableTrainTypes = useMemo(
    () =>
      trainTypes.filter((tt) =>
        tt.lines.some((l) => l.id === currentStation?.line?.id)
      ),
    [currentStation?.line?.id, trainTypes]
  )

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

  const { isLoading: isRoutesLoading, error: fetchRoutesError } = useSWR(
    ['/app.trainlcd.grpc/getRoutes', selectedStation?.groupId],
    async ([, toStationGroupId]) => {
      if (!currentStation || !toStationGroupId) {
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
    async (stationFromSearch: Station) => {
      setLineState((prev) => ({
        ...prev,
        selectedLine: stationFromSearch.line ?? null,
      }))
      setSelectedStation(stationFromSearch)

      if (stationFromSearch.hasTrainTypes) {
        await fetchTrainTypes({
          stationId: stationFromSearch.id,
        })
        setIsRouteListModalVisible(true)
        return
      }

      navigation.navigate('SelectBound')
    },
    [fetchTrainTypes, navigation, setLineState]
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
    async (trainType: TrainType) => {
      if (!trainType.id) {
        setNavigationState((prev) => ({ ...prev, trainType: null }))
        navigation.navigate('SelectBound')
        return
      }

      const stations = await fetchTrainTypeFromTrainTypeId({
        lineGroupId: trainType.groupId,
      })

      setNavigationState((prev) => ({ ...prev, trainType }))
      setStationState((prev) => ({ ...prev, stations }))
      navigation.navigate('SelectBound')
    },
    [
      fetchTrainTypeFromTrainTypeId,
      navigation,
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

      <RouteListModal
        trainTypes={reachableTrainTypes}
        visible={isRouteListModalVisible}
        loading={isRoutesLoading}
        error={fetchRoutesError}
        onClose={() => setIsRouteListModalVisible(false)}
        onSelect={handleSelect}
      />
    </>
  )
}

export default React.memo(RouteSearchScreen)

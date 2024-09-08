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
import { useRecoilState, useSetRecoilState } from 'recoil'

import {
  NEARBY_STATIONS_LIMIT,
  SEARCH_STATION_RESULT_LIMIT,
} from 'react-native-dotenv'
import useSWRMutation from 'swr/mutation'
import {
  GetStationByCoordinatesRequest,
  GetStationsByNameRequest,
  Station,
} from '../../gen/proto/stationapi_pb'
import FAB from '../components/FAB'
import Heading from '../components/Heading'
import { StationList } from '../components/StationList'
import { FONTS } from '../constants'
import { useCurrentStation } from '../hooks/useCurrentStation'
import { setLatLon, useLocationStore } from '../hooks/useLocationStore'
import { useThemeStore } from '../hooks/useThemeStore'
import { grpcClient } from '../lib/grpc'
import { APP_THEME } from '../models/Theme'
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

const FakeStationSettingsScreen: React.FC = () => {
  const [query, setQuery] = useState('')
  const navigation = useNavigation()
  const [{ station: stationFromState }, setStationState] =
    useRecoilState(stationState)
  const setNavigationState = useSetRecoilState(navigationState)
  const latitude = useLocationStore((state) => state?.coords.latitude)
  const longitude = useLocationStore((state) => state?.coords.longitude)
  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED)

  const currentStation = useCurrentStation()

  const {
    data: byCoordsData,
    isMutating: isByCoordsLoading,
    error: byCoordsError,
    trigger: mutateByCoords,
  } = useSWRMutation(['/app.trainlcd.grpc/getStationsByCoords'], async () => {
    if (!latitude || !longitude) {
      return
    }

    const req = new GetStationByCoordinatesRequest({
      latitude,
      longitude,
      limit: Number(NEARBY_STATIONS_LIMIT),
    })

    const res = await grpcClient.getStationsByCoordinates(req)
    return res.stations
  })
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
      })
      const res = await grpcClient.getStationsByName(req)
      return res.stations
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
    if (byNameError || byCoordsError) {
      Alert.alert(translate('errorTitle'), translate('apiErrorText'))
    }
  }, [byCoordsError, byNameError])

  useEffect(() => {
    mutateByCoords()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const foundStations = useMemo(
    () => byNameData ?? byCoordsData ?? [],
    [byCoordsData, byNameData]
  )

  // NOTE: 今いる駅は出なくていい
  const groupedStations = useMemo(
    () =>
      groupStations(foundStations).filter(
        (sta) => sta.groupId !== currentStation?.groupId
      ),
    [currentStation?.groupId, foundStations]
  )

  const handleStationPress = useCallback(
    (stationFromSearch: Station) => {
      const station = foundStations.find((s) => s.id === stationFromSearch.id)
      if (!station) {
        return
      }
      setStationState((prev) => ({
        ...prev,
        station,
      }))
      setNavigationState((prev) => ({
        ...prev,
        stationForHeader: station,
      }))
      setLatLon(station.latitude, station.longitude)
      onPressBack()
    },
    [foundStations, onPressBack, setNavigationState, setStationState]
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
            {translate('searchFirstStationTitle')}
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
          {isByCoordsLoading || isByNameLoading ? (
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
      {((latitude && longitude) || stationFromState) && (
        <FAB onPress={onPressBack} icon="close" />
      )}
    </>
  )
}

export default React.memo(FakeStationSettingsScreen)

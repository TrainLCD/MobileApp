import { useNavigation } from '@react-navigation/native'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  TextInput,
  TextInputChangeEventData,
  TextInputKeyPressEventData,
  TouchableOpacity,
  View,
} from 'react-native'
import { RFValue } from 'react-native-responsive-fontsize'
import { useRecoilState, useSetRecoilState } from 'recoil'

import {
  NEARBY_STATIONS_LIMIT,
  SEARCH_STATION_RESULT_LIMIT,
} from 'react-native-dotenv'
import useSWRImmutable from 'swr/immutable'
import useSWRMutation from 'swr/mutation'
import {
  GetStationByCoordinatesRequest,
  GetStationsByNameRequest,
  Station,
} from '../../gen/proto/stationapi_pb'
import { FONTS } from '../constants'
import { useLocationStore } from '../hooks/useLocationStore'
import { useThemeStore } from '../hooks/useThemeStore'
import { grpcClient } from '../lib/grpc'
import { APP_THEME } from '../models/Theme'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import { isJapanese, translate } from '../translation'
import { groupStations } from '../utils/groupStations'
import FAB from './FAB'
import Heading from './Heading'
import Typography from './Typography'

const styles = StyleSheet.create({
  rootPadding: {
    padding: 72,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  settingItem: {
    width: '65%',
    alignItems: 'center',
  },
  heading: {
    marginBottom: 24,
  },
  stationNameInput: {
    borderWidth: 1,
    padding: 12,
    width: '100%',
    marginBottom: 24,
    fontSize: RFValue(14),
  },
  stationNameText: {
    fontSize: RFValue(14),
  },
  cell: {
    flex: 1,
    padding: 12,
  },
  divider: {
    height: 1,
    width: '100%',
    backgroundColor: '#aaa',
  },
  emptyText: {
    fontSize: RFValue(16),
    textAlign: 'center',
    marginTop: 12,
    fontWeight: 'bold',
  },
})

interface StationNameCellProps {
  item: Station
  onPress: (station: Station) => void
}

const StationNameCell: React.FC<StationNameCellProps> = ({
  item,
  onPress,
}: StationNameCellProps) => {
  const handleOnPress = useCallback(() => {
    onPress(item)
  }, [item, onPress])
  return (
    <TouchableOpacity style={styles.cell} onPress={handleOnPress}>
      <Typography style={styles.stationNameText}>
        {isJapanese ? item.name : item.nameRoman}
      </Typography>
    </TouchableOpacity>
  )
}

const FakeStationSettings: React.FC = () => {
  const [query, setQuery] = useState('')
  const navigation = useNavigation()
  const [{ station: stationFromState }, setStationState] =
    useRecoilState(stationState)
  const setNavigationState = useSetRecoilState(navigationState)
  const latitude = useLocationStore((state) => state?.coords.latitude)
  const longitude = useLocationStore((state) => state?.coords.longitude)
  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED)

  const {
    data: byCoordsData,
    isLoading: isByCoordsLoading,
    error: byCoordsError,
  } = useSWRImmutable(
    ['/app.trainlcd.grpc/getStationsByCoords', latitude, longitude],
    async ([, latitude, longitude]) => {
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
    }
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

  const foundStations = useMemo(
    () => byNameData ?? byCoordsData ?? [],
    [byCoordsData, byNameData]
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
      onPressBack()
    },
    [foundStations, onPressBack, setNavigationState, setStationState]
  )

  const renderStationNameCell = useCallback(
    ({ item }: { item: Station }) => (
      <>
        <StationNameCell onPress={handleStationPress} item={item} />
        <View style={styles.divider} />
      </>
    ),
    [handleStationPress]
  )

  const keyExtractor = useCallback((item: Station) => item.id.toString(), [])

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

  const ListEmptyComponent: React.FC = () => {
    if (isByCoordsLoading || isByNameLoading) {
      return null
    }

    return (
      <Typography style={styles.emptyText}>
        {translate('stationListEmpty')}
      </Typography>
    )
  }

  return (
    <>
      <View
        style={{
          ...styles.rootPadding,
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
            autoFocus
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
          <View
            style={{
              width: '100%',
              height: '65%',
            }}
          >
            {isByCoordsLoading || isByNameLoading ? (
              <ActivityIndicator size="large" />
            ) : (
              <FlatList
                style={{
                  borderColor: isLEDTheme ? '#fff' : '#aaa',
                  borderWidth: foundStations.length ? 1 : 0,
                }}
                data={groupStations(foundStations)}
                renderItem={renderStationNameCell}
                keyExtractor={keyExtractor}
                ListEmptyComponent={ListEmptyComponent}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
      {((latitude && longitude) || stationFromState) && (
        <FAB onPress={onPressBack} icon="close" />
      )}
    </>
  )
}

export default React.memo(FakeStationSettings)

import { useNavigation } from '@react-navigation/native'
import React, { useCallback, useEffect, useRef, useState } from 'react'
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
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'

import {
  NEARBY_STATIONS_LIMIT,
  SEARCH_STATION_RESULT_LIMIT,
} from 'react-native-dotenv'
import {
  GetStationByCoordinatesRequest,
  GetStationsByNameRequest,
  Station,
} from '../../gen/proto/stationapi_pb'
import { FONTS } from '../constants'
import { grpcClient } from '../lib/grpc'
import locationState from '../store/atoms/location'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import { isLEDSelector } from '../store/selectors/isLED'
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
    width: '50%',
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
  const [foundStations, setFoundStations] = useState<Station[]>([])
  const [dirty, setDirty] = useState(false)
  const [byNameError, setByNameError] = useState<Error | null>(null)
  const [byCoordinatesError, setByCoordinatesError] = useState<Error | null>(
    null
  )
  const [loading, setLoading] = useState(false)

  const navigation = useNavigation()
  const [{ station: stationFromState }, setStationState] =
    useRecoilState(stationState)
  const setNavigationState = useSetRecoilState(navigationState)
  const [{ location }, setLocationState] = useRecoilState(locationState)
  const isLEDTheme = useRecoilValue(isLEDSelector)

  const prevQueryRef = useRef<string>()

  const onPressBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack()
      return
    }
    navigation.navigate('MainStack')
  }, [navigation])

  const triggerChange = useCallback(async () => {
    const trimmedQuery = query.trim()
    const trimmedPrevQuery = prevQueryRef.current?.trim()
    if (!trimmedQuery.length || trimmedQuery === trimmedPrevQuery) {
      return
    }

    setDirty(true)
    prevQueryRef.current = trimmedQuery

    try {
      setLoading(true)

      const byNameReq = new GetStationsByNameRequest()
      byNameReq.stationName = trimmedQuery
      byNameReq.limit = Number(SEARCH_STATION_RESULT_LIMIT)
      const byNameData = await grpcClient.getStationsByName(byNameReq)

      if (byNameData?.stations) {
        setFoundStations(byNameData?.stations?.filter((s) => !!s))
      }
      setLoading(false)
    } catch (err) {
      setByNameError(err as Error)
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    const fetchAsync = async () => {
      if (!location?.coords) {
        return
      }
      try {
        setLoading(true)

        const byCoordinatesReq = new GetStationByCoordinatesRequest()
        byCoordinatesReq.latitude = location.coords.latitude
        byCoordinatesReq.longitude = location.coords.longitude
        byCoordinatesReq.limit = Number(NEARBY_STATIONS_LIMIT)
        const byCoordinatesData = await grpcClient.getStationsByCoordinates(
          byCoordinatesReq,
          {}
        )

        if (byCoordinatesData?.stations) {
          setFoundStations(byCoordinatesData.stations.filter((s) => !!s))
        }
        setLoading(false)
      } catch (err) {
        setByCoordinatesError(err as Error)
        setLoading(false)
      }
    }

    fetchAsync()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (byNameError || byCoordinatesError) {
      Alert.alert(translate('errorTitle'), translate('apiErrorText'))
    }
  }, [byCoordinatesError, byNameError])

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
      setLocationState((prev) => ({
        ...prev,
        location: prev.location ?? {
          timestamp: -1,
          coords: {
            accuracy: 0,
            altitude: 0,
            altitudeAccuracy: -1,
            heading: 0,
            speed: 0,
            latitude: station.latitude,
            longitude: station.longitude,
          },
        },
      }))
      onPressBack()
    },
    [
      foundStations,
      onPressBack,
      setLocationState,
      setNavigationState,
      setStationState,
    ]
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
        triggerChange()
      }
    },
    [triggerChange]
  )

  const onChange = useCallback(
    (e: NativeSyntheticEvent<TextInputChangeEventData>) => {
      setQuery(e.nativeEvent.text)
    },
    []
  )

  const ListEmptyComponent: React.FC = () => {
    if (!dirty || loading) {
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
            onSubmitEditing={triggerChange}
            onKeyPress={onKeyPress}
          />
          <View
            style={{
              width: '100%',
              height: '65%',
            }}
          >
            {loading ? (
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
      {(location || stationFromState) && (
        <FAB onPress={onPressBack} icon="close" />
      )}
    </>
  )
}

export default React.memo(FakeStationSettings)

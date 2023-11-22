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
import { useRecoilState, useSetRecoilState } from 'recoil'
import {
  GetStationByCoordinatesRequest,
  GetStationsByNameRequest,
  Station,
} from '../gen/stationapi_pb'

import { NEARBY_STATIONS_LIMIT } from 'react-native-dotenv'
import { FONTS } from '../constants'
import useGRPC from '../hooks/useGRPC'
import { useIsLEDTheme } from '../hooks/useIsLEDTheme'
import locationState from '../store/atoms/location'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import { isJapanese, translate } from '../translation'
import { getDeadline } from '../utils/deadline'
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
  loadingRoot: {
    marginBottom: 24,
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
  item: Station.AsObject
  onPress: (station: Station.AsObject) => void
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

const Loading: React.FC = () => (
  <View style={styles.loadingRoot}>
    <ActivityIndicator size="large" />
  </View>
)

const FakeStationSettings: React.FC = () => {
  const [query, setQuery] = useState('')
  const [foundStations, setFoundStations] = useState<Station.AsObject[]>([])
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
  const prevQueryRef = useRef<string>()

  const grpcClient = useGRPC()
  const isLEDTheme = useIsLEDTheme()

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
    setFoundStations([])
    prevQueryRef.current = trimmedQuery

    try {
      setLoading(true)

      const byNameReq = new GetStationsByNameRequest()
      byNameReq.setStationName(trimmedQuery)
      byNameReq.setLimit(parseInt(NEARBY_STATIONS_LIMIT, 10))
      const deadline = getDeadline()
      const byNameData = (
        await grpcClient?.getStationsByName(byNameReq, { deadline })
      )?.toObject()

      if (byNameData?.stationsList) {
        setFoundStations(byNameData?.stationsList?.filter((s) => !!s))
      }
      setLoading(false)
    } catch (err) {
      setByNameError(err as Error)
      setLoading(false)
    }
  }, [grpcClient, query])

  useEffect(() => {
    const fetchAsync = async () => {
      if (foundStations.length || !location?.coords || dirty) {
        return
      }
      try {
        setLoading(true)

        const byCoordinatesReq = new GetStationByCoordinatesRequest()
        byCoordinatesReq.setLatitude(location.coords.latitude)
        byCoordinatesReq.setLongitude(location.coords.longitude)
        byCoordinatesReq.setLimit(parseInt(NEARBY_STATIONS_LIMIT, 10))
        const deadline = getDeadline()

        const byCoordinatesData = (
          await grpcClient?.getStationsByCoordinates(byCoordinatesReq, {
            deadline,
          })
        )?.toObject()

        if (byCoordinatesData?.stationsList) {
          setFoundStations(byCoordinatesData?.stationsList.filter((s) => !!s))
        }
        setLoading(false)
      } catch (err) {
        setByCoordinatesError(err as Error)
        setLoading(false)
      }
    }

    fetchAsync()
  }, [dirty, foundStations.length, grpcClient, location?.coords])

  useEffect(() => {
    if (byNameError || byCoordinatesError) {
      Alert.alert(translate('errorTitle'), translate('apiErrorText'))
    }
  }, [byCoordinatesError, byNameError])

  const handleStationPress = useCallback(
    (stationFromSearch: Station.AsObject) => {
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
        location: {
          coords: {
            accuracy: 0,
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
    ({ item }) => (
      <>
        <StationNameCell onPress={handleStationPress} item={item} />
        <View style={styles.divider} />
      </>
    ),
    [handleStationPress]
  )

  const keyExtractor = useCallback((item) => item.id.toString(), [])

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
    if (!dirty) {
      return null
    }

    if (loading) {
      return <Loading />
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
        <Heading style={styles.heading}>
          {translate('searchFirstStationTitle')}
        </Heading>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.settingItem}
        >
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
              height: '75%',
            }}
          >
            {loading && <Loading />}
            {!loading && (
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
        <FAB onPress={onPressBack} icon="md-close" />
      )}
    </>
  )
}

export default React.memo(FakeStationSettings)

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
import { NEARBY_STATIONS_LIMIT } from 'react-native-dotenv'
import { RFValue } from 'react-native-responsive-fontsize'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import { PREFS_EN, PREFS_JA } from '../constants'
import {
  GetStationByCoordinatesRequest,
  GetStationsByNameRequest,
  Station,
} from '../gen/stationapi_pb'

import useGRPC from '../hooks/useGRPC'
import locationState from '../store/atoms/location'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import { isJapanese, translate } from '../translation'
import FAB from './FAB'
import Heading from './Heading'
import Typography from './Typography'

type StationForSearch = Station.AsObject & {
  nameForSearch?: string
  nameForSearchR?: string
}

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
    borderColor: '#aaa',
    padding: 12,
    width: '100%',
    marginBottom: 24,
    color: 'black',
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
  flatList: {
    borderColor: '#aaa',
  },
})

interface StationNameCellProps {
  item: StationForSearch
  onPress: (station: StationForSearch) => void
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
        {isJapanese ? item.nameForSearch : item.nameForSearchR}
      </Typography>
    </TouchableOpacity>
  )
}

const Loading: React.FC = () => (
  <View style={styles.loadingRoot}>
    <ActivityIndicator size="large" color="#555" />
  </View>
)

const FakeStationSettings: React.FC = () => {
  const [query, setQuery] = useState('')
  const [foundStations, setFoundStations] = useState<StationForSearch[]>([])
  const [dirty, setDirty] = useState(false)
  const [loadingEligibility, setLoadingEligibility] = useState(false)
  const [byNameError, setByNameError] = useState<Error | null>(null)
  const [byCoordinatesError, setByCoordinatesError] = useState<Error | null>(
    null
  )
  const [loading, setLoading] = useState(false)

  const navigation = useNavigation()
  const [{ station: stationFromState }, setStationState] =
    useRecoilState(stationState)
  const setNavigationState = useSetRecoilState(navigationState)
  const { location } = useRecoilValue(locationState)
  const prevQueryRef = useRef<string>()

  const grpcClient = useGRPC()

  const processStations = useCallback(
    (stations: Station.AsObject[], sortRequired?: boolean) => {
      const mapped = stations
        .map((g, i, arr) => {
          const sameNameAndDifferentPrefStations = arr.filter(
            (s) => s.name === g.name && s.prefectureId !== g.prefectureId
          )
          if (sameNameAndDifferentPrefStations.length) {
            return {
              ...g,
              nameForSearch: `${g.name}(${PREFS_JA[g.prefectureId - 1]})`,
              nameForSearchR: `${g.nameRoman}(${PREFS_EN[g.prefectureId - 1]})`,
            }
          }
          return {
            ...g,
            nameForSearch: g.name,
            nameForSearchR: g.nameRoman,
          }
        })
        .map((g, i, arr) => {
          const sameNameStations = arr.filter(
            (s) => s.nameForSearch === g.nameForSearch
          )
          if (sameNameStations.length) {
            return sameNameStations.reduce((acc, cur) => ({
              ...acc,
              lines: Array.from(new Set([...acc.linesList, ...cur.linesList])),
            }))
          }
          return g
        })
        .filter(
          (g, i, arr) =>
            arr.findIndex((s) => s.nameForSearch === g.nameForSearch) === i
        )
        .sort((a, b) =>
          sortRequired ? b.linesList.length - a.linesList.length : 0
        )
      setFoundStations(mapped)
    },
    []
  )

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
    setLoadingEligibility(true)
    setFoundStations([])
    prevQueryRef.current = trimmedQuery

    try {
      setLoading(true)

      const byNameReq = new GetStationsByNameRequest()
      byNameReq.setStationName(trimmedQuery)
      byNameReq.setLimit(10)
      const byNameData = (
        await grpcClient?.getStationsByName(byNameReq, null)
      )?.toObject()

      if (byNameData?.stationsList) {
        processStations(
          byNameData?.stationsList
            ?.filter((s) => !!s)
            .map((s) => s as Station.AsObject),
          true
        )
      }
      setLoading(false)
    } catch (err) {
      setByNameError(err as Error)
      setLoading(false)
    }
  }, [grpcClient, processStations, query])

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
        const byCoordinatesData = (
          await grpcClient?.getStationsByCoordinates(byCoordinatesReq, null)
        )?.toObject()

        if (byCoordinatesData?.stationsList) {
          processStations(
            byCoordinatesData?.stationsList
              .filter((s) => !!s)
              .map((s) => s as Station.AsObject) || []
          )
        }
        setLoading(false)
      } catch (err) {
        setByCoordinatesError(err as Error)
        setLoading(false)
      }
    }

    fetchAsync()
  }, [
    dirty,
    foundStations.length,
    grpcClient,
    location?.coords,
    processStations,
  ])

  useEffect(() => {
    if (byNameError || byCoordinatesError) {
      Alert.alert(translate('errorTitle'), translate('apiErrorText'))
    }
  }, [byCoordinatesError, byNameError])

  const handleStationPress = useCallback(
    (station: StationForSearch) => {
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
    [onPressBack, setNavigationState, setStationState]
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
    if (loading || loadingEligibility) {
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
      <View style={styles.rootPadding}>
        <Heading style={styles.heading}>
          {translate('specifyStationTitle')}
        </Heading>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.settingItem}
        >
          <TextInput
            autoFocus
            placeholder={translate('searchByStationNamePlaceholder')}
            value={query}
            style={styles.stationNameInput}
            onChange={onChange}
            onSubmitEditing={triggerChange}
            onKeyPress={onKeyPress}
          />
          <View
            style={{
              width: '100%',
              height: '50%',
            }}
          >
            {loading && <Loading />}
            {!loading && (
              <FlatList
                style={{
                  ...styles.flatList,
                  borderWidth: foundStations.length ? 1 : 0,
                }}
                data={foundStations}
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

export default FakeStationSettings

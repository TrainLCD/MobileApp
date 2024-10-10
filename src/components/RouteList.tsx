import { useMutation } from '@connectrpc/connect-query'
import React, { useCallback, useMemo, useState } from 'react'
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native'
import { RFValue } from 'react-native-responsive-fontsize'
import { useSetRecoilState } from 'recoil'
import { getTrainTypesByStationId } from '../../gen/proto/stationapi-StationAPI_connectquery'
import { Route, TrainType } from '../../gen/proto/stationapi_pb'
import { useCurrentStation } from '../hooks/useCurrentStation'
import { useThemeStore } from '../hooks/useThemeStore'
import { APP_THEME } from '../models/Theme'
import lineState from '../store/atoms/line'
import { isJapanese } from '../translation'
import { TrainTypeInfoModal } from './TrainTypeInfoModal'
import Typography from './Typography'

const styles = StyleSheet.create({
  cell: { padding: 12 },
  stationNameText: {
    fontSize: RFValue(14),
  },
  descriptionText: {
    fontSize: RFValue(11),
    marginTop: 8,
  },
  separator: { height: 1, width: '100%', backgroundColor: '#aaa' },
})

const Separator = () => <View style={styles.separator} />

const ItemCell = ({
  item,
  loading,
  onSelect,
}: {
  item: Route
  loading: boolean
  onSelect: (item: Route) => void
}) => {
  const currentStation = useCurrentStation()

  const lineNameTitle = useMemo(() => {
    const trainType = item.stops.find(
      (stop) => stop.groupId === Number(currentStation?.groupId)
    )?.trainType

    if (!isJapanese) {
      const lineName = item.stops.find(
        (s) => s.groupId === currentStation?.groupId
      )?.line?.nameRoman
      const typeName = trainType?.nameRoman ?? 'Local'

      return `${lineName} ${typeName}`
    }
    const lineName = item.stops.find(
      (s) => s.groupId === currentStation?.groupId
    )?.line?.nameShort
    const typeName = trainType?.name ?? '普通または各駅停車'

    return `${lineName} ${typeName}`
  }, [currentStation?.groupId, item.stops])

  const bottomText = useMemo(() => {
    return `${item.stops[0]?.name}から${
      item.stops[item.stops.length - 1]?.name
    }まで`
  }, [item.stops])

  return (
    <TouchableOpacity
      style={styles.cell}
      onPress={() => onSelect(item)}
      disabled={loading}
    >
      <Typography style={styles.stationNameText}>{lineNameTitle}</Typography>
      <Typography style={styles.descriptionText} numberOfLines={1}>
        {bottomText}
      </Typography>
    </TouchableOpacity>
  )
}

export const RouteList = ({
  routes,
  onSelect,
  loading,
}: {
  routes: Route[]
  onSelect: (item: Route | undefined) => void
  loading: boolean
}) => {
  const [trainTypeInfoModalVisible, setTrainTypeInfoModalVisible] =
    useState(false)
  const [selectedRoute, setSelectedRoute] = useState<Route>()
  const [selectedTrainType, setSelectedTrainType] = useState<TrainType>()
  const setLineState = useSetRecoilState(lineState)

  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED)
  const currentStation = useCurrentStation()

  const {
    data: trainTypes,
    mutate: fetchTrainTypes,
    status: fetchTrainTypesStatus,
    error: fetchTrainTypesError,
  } = useMutation(getTrainTypesByStationId)

  const trainType = useMemo(
    () =>
      trainTypes?.trainTypes.find(
        (tt) => tt.groupId === selectedTrainType?.groupId
      ) ?? null,
    [selectedTrainType?.groupId, trainTypes?.trainTypes]
  )

  const handleSelect = useCallback(
    async (route: Route) => {
      setTrainTypeInfoModalVisible(true)
      setLineState((prev) => ({
        ...prev,
        selectedLine:
          route.stops?.find((s) => s.groupId === currentStation?.groupId)
            ?.line ?? null,
      }))
      setSelectedRoute(route)
      setSelectedTrainType(
        route.stops.find((s) => s.groupId === currentStation?.groupId)
          ?.trainType
      )
      fetchTrainTypes({
        stationId: route.stops.find((s) => s.groupId == currentStation?.groupId)
          ?.id,
      })
    },
    [currentStation?.groupId, fetchTrainTypes, setLineState]
  )

  const renderItem = useCallback(
    ({ item }: { item: Route; index: number }) => {
      return (
        <ItemCell
          item={item}
          onSelect={() => handleSelect(item)}
          loading={loading}
        />
      )
    },
    [handleSelect, loading]
  )
  const keyExtractor = useCallback((item: Route) => item.id.toString(), [])

  return (
    <>
      <FlatList
        initialNumToRender={routes.length}
        style={{
          width: '100%',
          height: '100%',
          alignSelf: 'center',
          borderColor: isLEDTheme ? '#fff' : '#aaa',
          borderWidth: 1,
          flex: 1,
        }}
        data={routes}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ItemSeparatorComponent={Separator}
        ListFooterComponent={Separator}
      />
      <TrainTypeInfoModal
        visible={trainTypeInfoModalVisible}
        trainType={trainType}
        error={fetchTrainTypesError}
        loading={fetchTrainTypesStatus === 'pending'}
        disabled={loading}
        stations={selectedRoute?.stops ?? []}
        onClose={() => setTrainTypeInfoModalVisible(false)}
        onConfirmed={() => onSelect(selectedRoute)}
      />
    </>
  )
}

import { useNavigation } from '@react-navigation/native'
import React, { useCallback, useEffect, useMemo } from 'react'
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { RFValue } from 'react-native-responsive-fontsize'
import { useRecoilState, useSetRecoilState } from 'recoil'
import {
  Line,
  Station,
  StopCondition,
  TrainType,
} from '../../gen/proto/stationapi_pb'
import Button from '../components/Button'
import ErrorScreen from '../components/ErrorScreen'
import Heading from '../components/Heading'
import Typography from '../components/Typography'
import { TOEI_OEDO_LINE_ID } from '../constants'
import { TOEI_OEDO_LINE_TOCHOMAE_STATION_ID } from '../constants/station'
import useBounds from '../hooks/useBounds'
import { useLoopLine } from '../hooks/useLoopLine'
import useStationList from '../hooks/useStationList'
import { LineDirection, directionToDirectionName } from '../models/Bound'
import lineState from '../store/atoms/line'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import { isJapanese, translate } from '../translation'
import getCurrentStationIndex from '../utils/currentStationIndex'

const styles = StyleSheet.create({
  boundLoading: {
    marginTop: 16,
  },
  bottom: {
    padding: 16,
  },
  buttons: {
    marginTop: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    marginLeft: 8,
    marginRight: 8,
  },
  horizontalButtons: {
    flexDirection: 'row',
    marginVertical: 12,
  },
  menuNotice: {
    fontWeight: 'bold',
    marginTop: 12,
    fontSize: RFValue(18),
    textAlign: 'center',
  },
})

type RenderButtonProps = {
  boundStations: Station[]
  direction: LineDirection
}

const SelectBoundScreen: React.FC = () => {
  const navigation = useNavigation()
  const [{ station, stations, wantedDestination }, setStationState] =
    useRecoilState(stationState)
  const [
    { trainType, fetchedTrainTypes, autoModeEnabled, fromBuilder },
    setNavigation,
  ] = useRecoilState(navigationState)
  const [{ selectedLine }, setLineState] = useRecoilState(lineState)
  const setNavigationState = useSetRecoilState(navigationState)

  const { loading, error, fetchInitialStation } = useStationList()
  const { isLoopLine, isMeijoLine } = useLoopLine()
  const {
    bounds: [inboundStations, outboundStations],
  } = useBounds()

  // 種別選択ボタンを表示するかのフラグ
  const withTrainTypes = useMemo(
    (): boolean => fetchedTrainTypes.length > 1,
    [fetchedTrainTypes]
  )

  const currentIndex = getCurrentStationIndex(stations, station)

  const handleSelectBoundBackButtonPress = useCallback(() => {
    setLineState((prev) => ({
      ...prev,
      selectedLine: null,
    }))
    setStationState((prev) => ({
      ...prev,
      stations: [],
      wantedDestination: null,
    }))
    setNavigationState((prev) => ({
      ...prev,
      headerState: isJapanese ? 'CURRENT' : 'CURRENT_EN',
      trainType: null,
      bottomState: 'LINE',
      leftStations: [],
      stationForHeader: null,
      fetchedTrainTypes: [],
    }))
    navigation.navigate('SelectLine')
  }, [navigation, setLineState, setNavigationState, setStationState])

  const handleBoundSelected = useCallback(
    (selectedStation: Station, direction: LineDirection): void => {
      const sameGroupStations = stations.filter(
        (s) => s.groupId === selectedLine?.station?.groupId
      )

      // 同じグループIDで2駅ある場合は種別の分かれ目なので、押したボタン側の駅を設定する
      // この処理で例えば半蔵門線渋谷駅でどちらのボタンを押しても最初は紫色を使われる問題を解消できる
      if (sameGroupStations.length === 2) {
        setStationState((prev) => ({
          ...prev,
          station:
            direction === 'INBOUND'
              ? sameGroupStations[1]
              : sameGroupStations[0],
        }))
      }

      const oedoLineTerminus =
        direction === 'INBOUND' ? stations[stations.length - 1] : stations[0]

      setStationState((prev) => ({
        ...prev,
        selectedBound:
          selectedLine?.id === TOEI_OEDO_LINE_ID
            ? oedoLineTerminus
            : selectedStation,
        selectedDirection: direction,
      }))
      navigation.navigate('Main')
    },
    [navigation, selectedLine, setStationState, stations]
  )

  const handleNotificationButtonPress = (): void => {
    navigation.navigate('Notification')
  }

  const handleTrainTypeButtonPress = (): void => {
    navigation.navigate('TrainType')
  }

  const handleAutoModeButtonPress = useCallback(async () => {
    setNavigation((prev) => ({
      ...prev,
      autoModeEnabled: !prev.autoModeEnabled,
    }))
  }, [setNavigation])

  const handleAllStopsButtonPress = useCallback(() => {
    const stopStations = stations.filter(
      (s) => s.stopCondition !== StopCondition.Not
    )
    Alert.alert(
      translate('viewStopStations'),
      Array.from(
        new Set(stopStations.map((s) => (isJapanese ? s.name : s.nameRoman)))
      ).join(isJapanese ? '、' : ', ')
    )
  }, [stations])

  const handleSpecifyDestinationButtonPress = useCallback(() => {
    navigation.navigate('SpecifyDestinationSettings')
  }, [navigation])

  const handleWantedDestinationPress = useCallback(
    (destination: Station, direction: LineDirection) => {
      const stationLineIds = Array.from(
        new Set(stations.map((s) => s.line?.id).filter((id) => id))
      )

      const updatedTrainType: TrainType | null = trainType
        ? new TrainType({
            ...trainType,
            lines: trainType?.lines
              .filter((l, i) => l.id == stationLineIds[i])
              .map((l) => new Line(l)),
          })
        : null
      setStationState((prev) => ({
        ...prev,
        selectedBound: destination,
        selectedDirection: direction,
      }))
      setNavigation((prev) => ({ ...prev, trainType: updatedTrainType }))
      navigation.navigate('Main')
    },
    [navigation, setNavigation, setStationState, stations, trainType]
  )

  const normalLineDirectionText = useCallback(
    (boundStations: Station[]) => {
      if (
        selectedLine?.id === TOEI_OEDO_LINE_ID &&
        boundStations[1]?.id === TOEI_OEDO_LINE_TOCHOMAE_STATION_ID
      ) {
        if (isJapanese) {
          return `${boundStations[0]?.name}経由 都庁前行`
        }
        return `for Tochomae via ${boundStations[0]?.nameRoman}`
      }

      if (isJapanese) {
        return `${boundStations
          .map((s) => s.name)
          .slice(0, 2)
          .join('・')}方面`
      }
      return `for ${boundStations
        .slice(0, 2)
        .map((s) => s.nameRoman)
        .join(' and ')}`
    },
    [selectedLine?.id]
  )

  const loopLineDirectionText = useCallback(
    (direction: LineDirection) => {
      const directionName = directionToDirectionName(selectedLine, direction)

      if (isJapanese) {
        if (direction === 'INBOUND') {
          return `${directionName}(${inboundStations
            .map((s) => s.name)
            .join('・')}方面)`
        }
        return `${directionName}(${outboundStations
          .map((s) => s.name)
          .join('・')}方面)`
      }
      if (direction === 'INBOUND') {
        return `for ${inboundStations.map((s) => s.nameRoman).join(' and ')}`
      }
      return `for ${outboundStations.map((s) => s.nameRoman).join(' and ')}`
    },
    [inboundStations, outboundStations, selectedLine]
  )

  const renderButton: React.FC<RenderButtonProps> = useCallback(
    ({ boundStations, direction }: RenderButtonProps) => {
      if (wantedDestination) {
        const currentStationIndex = stations.findIndex(
          (s) => s.groupId === station?.groupId
        )
        const wantedStationIndex = stations.findIndex(
          (s) => s.groupId === wantedDestination.groupId
        )
        const dir =
          currentStationIndex < wantedStationIndex ? 'INBOUND' : 'OUTBOUND'
        if (direction === dir) {
          return (
            <Button
              style={styles.button}
              onPress={() =>
                handleWantedDestinationPress(wantedDestination, dir)
              }
            >
              {isJapanese
                ? `${wantedDestination.name}方面`
                : `for ${wantedDestination.nameRoman}`}
            </Button>
          )
        }
        return null
      }

      if (
        !boundStations.length ||
        (direction === 'INBOUND' &&
          !isLoopLine &&
          currentIndex === stations.length - 1) ||
        (direction === 'OUTBOUND' && !isLoopLine && !currentIndex)
      ) {
        return <></>
      }

      const directionText = isLoopLine
        ? loopLineDirectionText(direction)
        : normalLineDirectionText(boundStations)

      const boundSelectOnPress = (): void =>
        handleBoundSelected(boundStations[0], direction)
      return (
        <Button
          style={styles.button}
          key={boundStations[0]?.groupId}
          onPress={boundSelectOnPress}
        >
          {directionText}
        </Button>
      )
    },
    [
      currentIndex,
      handleBoundSelected,
      handleWantedDestinationPress,
      isLoopLine,
      loopLineDirectionText,
      normalLineDirectionText,
      station?.groupId,
      stations,
      wantedDestination,
    ]
  )

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        handleSelectBoundBackButtonPress()
        return true
      }
    )
    return subscription.remove
  }, [handleSelectBoundBackButtonPress])

  const autoModeButtonText = `${translate('autoModeSettings')}: ${
    autoModeEnabled ? 'ON' : 'OFF'
  }`

  if (error) {
    return (
      <ErrorScreen
        showStatus
        title={translate('errorTitle')}
        text={translate('apiErrorText')}
        onRetryPress={fetchInitialStation}
      />
    )
  }

  if (!stations.length || loading) {
    return (
      <ScrollView contentContainerStyle={styles.bottom}>
        <View style={styles.container}>
          <Heading>{translate('selectBoundTitle')}</Heading>
          <ActivityIndicator style={styles.boundLoading} size="large" />
          <View style={styles.buttons}>
            <Button onPress={handleSelectBoundBackButtonPress}>
              {translate('back')}
            </Button>
          </View>

          <Typography style={styles.menuNotice}>
            {translate('menuNotice')}
          </Typography>
        </View>
      </ScrollView>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.bottom}>
      <View style={styles.container}>
        <Heading>{translate('selectBoundTitle')}</Heading>

        <View style={styles.horizontalButtons}>
          {renderButton({
            boundStations: isMeijoLine ? outboundStations : inboundStations,
            direction: isMeijoLine ? 'OUTBOUND' : 'INBOUND',
          })}
          {renderButton({
            boundStations: isMeijoLine ? inboundStations : outboundStations,
            direction: isMeijoLine ? 'INBOUND' : 'OUTBOUND',
          })}
        </View>

        <Button onPress={handleSelectBoundBackButtonPress}>
          {translate('back')}
        </Button>
        <Typography style={styles.menuNotice}>
          {translate('menuNotice')}
        </Typography>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 16,
            marginTop: 12,
            justifyContent: 'center',
          }}
        >
          <Button onPress={handleNotificationButtonPress}>
            {translate('notifySettings')}
          </Button>
          {withTrainTypes ? (
            <Button onPress={handleTrainTypeButtonPress}>
              {translate('trainTypeSettings')}
            </Button>
          ) : null}
          <Button onPress={handleAllStopsButtonPress}>
            {translate('viewStopStations')}
          </Button>
          {/* NOTE: 処理が複雑になりそこまで需要もなさそうなので環状運転路線では行先を指定できないようにする */}
          {!isLoopLine && !fromBuilder ? (
            <Button onPress={handleSpecifyDestinationButtonPress}>
              {translate('selectBoundSettings')}
            </Button>
          ) : null}
          <Button onPress={handleAutoModeButtonPress}>
            {autoModeButtonText}
          </Button>
        </View>
      </View>
    </ScrollView>
  )
}

export default React.memo(SelectBoundScreen)

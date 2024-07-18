import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { TrainType } from '../../gen/proto/stationapi_pb'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import { currentStationSelector } from '../store/selectors/currentStation'
import useNextLine from './useNextLine'

const useNextTrainType = (): TrainType | null => {
  const { stations, selectedDirection } = useRecoilValue(stationState)
  const { trainType } = useRecoilValue(navigationState)
  const nextLine = useNextLine()
  const currentStation = useRecoilValue(currentStationSelector({}))

  // 同じ路線でも種別が変わる場合を想定(小田急線等)
  const sameLineNextType = useMemo(() => {
    if (
      !(
        trainType?.line?.id === nextLine?.id &&
        trainType?.line?.company?.id === nextLine?.company?.id
      )
    ) {
      return
    }

    if (selectedDirection === 'INBOUND') {
      const currentIndex = stations.findIndex(
        (sta) => sta.groupId === currentStation?.groupId
      )
      return stations
        .slice(currentIndex, stations.length)
        .map((sta) => sta.trainType)
        .filter((tt) => tt)
        .find((tt) => tt?.typeId !== trainType?.typeId)
    }

    const currentIndex = stations
      .slice()
      .reverse()
      .findIndex((sta) => sta.groupId === currentStation?.groupId)
    return stations
      .slice()
      .reverse()
      .slice(currentIndex, stations.length)
      .map((sta) => sta.trainType)
      .filter((tt) => tt)
      .find((tt) => tt?.typeId !== trainType?.typeId)
  }, [
    currentStation?.groupId,
    nextLine?.company?.id,
    nextLine?.id,
    selectedDirection,
    stations,
    trainType?.line?.company?.id,
    trainType?.line?.id,
    trainType?.typeId,
  ])

  const nextTrainType = useMemo(() => {
    return (
      sameLineNextType ??
      trainType?.lines?.find((l) => l.id === nextLine?.id)?.trainType
    )
  }, [nextLine?.id, sameLineNextType, trainType?.lines])

  return nextTrainType ?? null
}

export default useNextTrainType

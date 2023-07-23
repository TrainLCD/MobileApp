import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { TrainType } from '../gen/stationapi_pb'
import navigationState from '../store/atoms/navigation'
import useCurrentLine from './useCurrentLine'

const useCurrentTrainType = (): TrainType.AsObject | null => {
  const { trainType } = useRecoilValue(navigationState)
  const currentLine = useCurrentLine()

  const currentTrainType = useMemo(
    () =>
      trainType?.linesList?.find((l) => l.id === currentLine?.id)?.trainType,
    [currentLine?.id, trainType?.linesList]
  )

  return currentTrainType ?? null
}

export default useCurrentTrainType

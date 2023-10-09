import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { TrainType } from '../gen/stationapi_pb'
import navigationState from '../store/atoms/navigation'
import useNextLine from './useNextLine'

const useNextTrainType = (): TrainType.AsObject | null => {
  const { trainType } = useRecoilValue(navigationState)
  const nextLine = useNextLine()

  const nextTrainType = useMemo(
    () => trainType?.linesList?.find((l) => l.id === nextLine?.id)?.trainType,
    [nextLine?.id, trainType?.linesList]
  )

  return nextTrainType ?? null
}

export default useNextTrainType

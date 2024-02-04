import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { TrainType } from '../../gen/proto/stationapi_pb'
import navigationState from '../store/atoms/navigation'
import useNextLine from './useNextLine'

const useNextTrainType = (): TrainType | null => {
  const { trainType } = useRecoilValue(navigationState)
  const nextLine = useNextLine()

  const nextTrainType = useMemo(
    () => trainType?.lines?.find((l) => l.id === nextLine?.id)?.trainType,
    [nextLine?.id, trainType?.lines]
  )

  return nextTrainType ?? null
}

export default useNextTrainType

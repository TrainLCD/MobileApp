import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { TrainType } from '../gen/stationapi_pb'
import navigationState from '../store/atoms/navigation'
import useNextLine from './useNextLine'

const useNextTrainType = (): TrainType.AsObject | null => {
  const { fetchedTrainTypes } = useRecoilValue(navigationState)

  const nextLine = useNextLine()
  const nextTrainType = useMemo(() => {
    return fetchedTrainTypes?.find((tt) => tt.line?.id === nextLine?.id) ?? null
  }, [fetchedTrainTypes, nextLine?.id])

  return nextTrainType
}

export default useNextTrainType

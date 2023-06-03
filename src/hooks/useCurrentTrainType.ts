import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { APITrainType, APITrainTypeMinimum } from '../models/StationAPI'
import navigationState from '../store/atoms/navigation'
import useCurrentLine from './useCurrentLine'

const useCurrentTrainType = (): APITrainTypeMinimum | null => {
  const { trainType } = useRecoilValue(navigationState)
  const currentLine = useCurrentLine()
  const typedTrainType = trainType as APITrainType

  const currentTrainType = useMemo(
    () =>
      typedTrainType?.allTrainTypes.find(
        (tt) => tt.line.id === currentLine?.id
      ),
    [currentLine?.id, typedTrainType?.allTrainTypes]
  )

  return currentTrainType ?? null
}

export default useCurrentTrainType

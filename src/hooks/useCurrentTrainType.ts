import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { TrainType, TrainTypeKind } from '../../gen/proto/stationapi_pb'
import navigationState from '../store/atoms/navigation'
import { currentLineSelector } from '../store/selectors/currentLine'

const useCurrentTrainType = (): TrainType | null => {
  const { trainType } = useRecoilValue(navigationState)
  const currentLine = useRecoilValue(currentLineSelector)

  const currentTrainType = useMemo(
    () =>
      (trainType?.lines?.length || trainType?.kind === TrainTypeKind.Branch
        ? trainType?.lines?.find((l) => l.id === currentLine?.id)?.trainType
        : trainType) ?? null,
    [currentLine?.id, trainType]
  )

  return currentTrainType ?? null
}

export default useCurrentTrainType

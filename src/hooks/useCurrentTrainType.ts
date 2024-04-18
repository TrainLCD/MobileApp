import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { TrainType, TrainTypeKind } from '../../gen/proto/stationapi_pb'
import navigationState from '../store/atoms/navigation'
import { currentLineSelector } from '../store/selectors/currentLine'

const useCurrentTrainType = (): TrainType | null => {
  const { trainType, fromBuilder } = useRecoilValue(navigationState)
  const currentLine = useRecoilValue(currentLineSelector)

  const currentTrainType = useMemo(
    () =>
      ((trainType?.lines?.length ?? 1) > 1 ||
        trainType?.kind === TrainTypeKind.Branch) &&
      !fromBuilder
        ? trainType?.lines?.find((l) => l.id === currentLine?.id)?.trainType
        : trainType ?? null,
    [currentLine?.id, fromBuilder, trainType]
  )

  return currentTrainType ?? null
}

export default useCurrentTrainType

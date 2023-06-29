// const useCurrentTrainType = (): APITrainTypeMinimum | null => {
//   const { trainType } = useRecoilValue(navigationState)
//   const currentLine = useCurrentLine()
//   const typedTrainType = trainType as APITrainType

//   const currentTrainType = useMemo(
//     () =>
//       typedTrainType?.allTrainTypes.find(
//         (tt) => tt.line.id === currentLine?.id
//       ),
//     [currentLine?.id, typedTrainType?.allTrainTypes]
//   )

//   return currentTrainType ?? null
// }

const useCurrentTrainType = (): null => {
  return null
}

export default useCurrentTrainType

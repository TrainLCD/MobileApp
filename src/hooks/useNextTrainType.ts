// const useNextTrainType = (): APITrainTypeMinimum | null => {
//   const { trainType } = useRecoilValue(navigationState)

//   const nextLine = useNextLine()
//   const typedTrainType = trainType as APITrainType
//   const nextTrainType = useMemo(() => {
//     return (
//       typedTrainType?.allTrainTypes?.find(
//         (tt) => tt.line.id === nextLine?.id
//       ) ?? null
//     )
//   }, [nextLine?.id, typedTrainType?.allTrainTypes])

//   return nextTrainType
// }

const useNextTrainType = (): null => {
  return null
}

export default useNextTrainType

// FIXME: Expo SDK 52で react-native-watch-connectivity が使えなくなったので動くように修正する
const useAppleWatch = (): void => {
  // const { arrived, stations, selectedDirection } = useRecoilValue(stationState)
  // const station = useCurrentStation()
  // const currentLine = useCurrentLine()
  // const reachable = useReachability()
  // const [currentNumbering] = useNumbering()
  // const nextStation = useNextStation()
  // const stoppingState = useStoppingState()
  // const { isLoopLine } = useLoopLine()
  // const switchedStation = useMemo<Station | null>(
  //   () => (arrived && !getIsPass(station) ? station : nextStation ?? null),
  //   [arrived, nextStation, station]
  // )
  // const inboundStations = useMemo<Station[]>(() => {
  //   if (isLoopLine) {
  //     return stations.slice().reverse()
  //   }
  //   return stations
  // }, [isLoopLine, stations])
  // const outboundStations = useMemo<Station[]>(() => {
  //   if (isLoopLine) {
  //     return stations
  //   }
  //   return stations.slice().reverse()
  // }, [isLoopLine, stations])
  // const sendToWatch = useCallback(async (): Promise<void> => {
  //   if (switchedStation) {
  //     const msg = {
  //       state: stoppingState,
  //       station: {
  //         id: switchedStation.id,
  //         name: switchedStation.name,
  //         nameR: switchedStation.nameRoman,
  //         lines: switchedStation.lines
  //           .filter((l) => l.id !== currentLine?.id)
  //           .map((l) => ({
  //             id: l.id,
  //             lineColorC: l.color,
  //             name: l.nameShort.replace(parenthesisRegexp, ''),
  //             nameR: l.nameRoman?.replace(parenthesisRegexp, ''),
  //           })),
  //         stationNumber: currentNumbering?.stationNumber,
  //         pass: false,
  //       },
  //     }
  //     sendMessage(msg)
  //   }
  //   if (currentLine) {
  //     const switchedStations =
  //       selectedDirection === 'INBOUND' ? inboundStations : outboundStations
  //     const msg = {
  //       stationList: switchedStations.map((s) => ({
  //         id: s.id,
  //         name: s.name,
  //         nameR: s.nameRoman,
  //         lines: s.lines
  //           .filter((l) => l.id !== currentLine.id)
  //           .map((l) => ({
  //             id: l.id,
  //             lineColorC: l.color,
  //             name: l.nameShort.replace(parenthesisRegexp, ''),
  //             nameR: l.nameRoman?.replace(parenthesisRegexp, ''),
  //           })),
  //         stationNumber: s?.stationNumbers?.[0]?.stationNumber,
  //         pass: getIsPass(s),
  //       })),
  //       selectedLine: {
  //         id: currentLine.id,
  //         name: currentLine.nameShort.replace(parenthesisRegexp, ''),
  //         nameR: currentLine.nameRoman?.replace(parenthesisRegexp, ''),
  //       },
  //     }
  //     sendMessage(msg)
  //   } else {
  //     sendMessage({
  //       stationList: [],
  //     })
  //   }
  // }, [
  //   currentLine,
  //   currentNumbering?.stationNumber,
  //   inboundStations,
  //   outboundStations,
  //   selectedDirection,
  //   stoppingState,
  //   switchedStation,
  // ])
  // useEffect(() => {
  //   if (reachable) {
  //     sendToWatch()
  //   }
  // }, [sendToWatch, reachable])
}

export default useAppleWatch

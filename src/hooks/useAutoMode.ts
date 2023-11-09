import * as geolib from 'geolib'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import {
  AUTO_MODE_RUNNING_DURATION,
  AUTO_MODE_WHOLE_DURATION,
} from '../constants'
import lineState from '../store/atoms/line'
import locationState from '../store/atoms/location'
import stationState from '../store/atoms/station'
import dropEitherJunctionStation from '../utils/dropJunctionStation'
import { useLoopLine } from './useLoopLine'
import useValueRef from './useValueRef'

const useAutoMode = (enabled: boolean): void => {
  const {
    stations: rawStations,
    selectedDirection,
    station,
  } = useRecoilValue(stationState)
  const { selectedLine } = useRecoilValue(lineState)
  const setLocation = useSetRecoilState(locationState)

  const stations = useMemo(
    () => dropEitherJunctionStation(rawStations, selectedDirection),
    [rawStations, selectedDirection]
  )

  const [autoModeInboundIndex, setAutoModeInboundIndex] = useState(
    stations.findIndex((s) => s.groupId === station?.groupId)
  )
  const [autoModeOutboundIndex, setAutoModeOutboundIndex] = useState(
    stations.findIndex((s) => s.groupId === station?.groupId)
  )
  const autoModeInboundIndexRef = useValueRef(autoModeInboundIndex)
  const autoModeOutboundIndexRef = useValueRef(autoModeOutboundIndex)
  const [autoModeApproachingTimer, setAutoModeApproachingTimer] =
    useState<number>()
  const [autoModeArriveTimer, setAutoModeArriveTimer] = useState<number>()

  const { isLoopLine } = useLoopLine()

  const startApproachingTimer = useCallback(() => {
    if (
      !enabled ||
      autoModeApproachingTimer ||
      !selectedDirection ||
      !selectedLine
    ) {
      return
    }

    const intervalInternal = () => {
      if (selectedDirection === 'INBOUND') {
        const index = autoModeInboundIndexRef.current

        if (!index) {
          setLocation((prev) => ({
            ...prev,
            location: {
              coords: {
                latitude: stations[0].latitude,
                longitude: stations[0].longitude,
                accuracy: 0,
              },
            },
          }))
          return
        }

        const cur = stations[index]
        const next = isLoopLine ? stations[index - 1] : stations[index + 1]

        if (cur && next) {
          const center = geolib.getCenter([
            {
              latitude: cur.latitude,
              longitude: cur.longitude,
            },
            {
              latitude: next.latitude,
              longitude: next.longitude,
            },
          ])

          if (center) {
            setLocation((prev) => ({
              ...prev,
              location: {
                coords: { ...center, accuracy: 0 },
              },
            }))
          }
        }
      } else {
        const index = autoModeOutboundIndexRef.current

        if (index === stations.length - 1) {
          setLocation((prev) => ({
            ...prev,
            location: {
              coords: {
                latitude: stations[stations.length - 1].latitude,
                longitude: stations[stations.length - 1].longitude,
                accuracy: 0,
              },
            },
          }))
          return
        }

        const cur = stations[index]
        const next = isLoopLine ? stations[index + 1] : stations[index - 1]

        if (cur && next) {
          const center = geolib.getCenter([
            {
              latitude: cur.latitude,
              longitude: cur.longitude,
            },
            {
              latitude: next.latitude,
              longitude: next.longitude,
            },
          ])

          if (center) {
            setLocation((prev) => ({
              ...prev,
              location: {
                coords: { ...center, accuracy: 0 },
              },
            }))
          }
        }
      }
    }

    intervalInternal()

    const interval = setInterval(intervalInternal, AUTO_MODE_RUNNING_DURATION)

    setAutoModeApproachingTimer(interval)
  }, [
    enabled,
    autoModeApproachingTimer,
    selectedDirection,
    selectedLine,
    autoModeInboundIndexRef,
    stations,
    isLoopLine,
    setLocation,
    autoModeOutboundIndexRef,
  ])

  useEffect(() => {
    startApproachingTimer()
  }, [startApproachingTimer])

  const startArriveTimer = useCallback(() => {
    const direction = selectedDirection

    if (!enabled || autoModeArriveTimer || !direction || !selectedLine) {
      return
    }

    const intervalInternal = () => {
      if (direction === 'INBOUND') {
        const index = autoModeInboundIndexRef.current

        const next = stations[index]

        if (!isLoopLine && index === stations.length - 1) {
          setAutoModeInboundIndex(0)
        } else {
          setAutoModeInboundIndex((prev) => (isLoopLine ? prev - 1 : prev + 1))
        }

        if (!index && isLoopLine) {
          setAutoModeInboundIndex(stations.length - 1)
        }

        if (next) {
          setLocation((prev) => ({
            ...prev,
            location: {
              coords: {
                latitude: next.latitude,
                longitude: next.longitude,
                accuracy: 0,
              },
            },
          }))
        }
      } else if (direction === 'OUTBOUND') {
        const index = autoModeOutboundIndexRef.current

        const next = stations[index]
        if (!isLoopLine && !index) {
          setAutoModeOutboundIndex(stations.length)
        } else {
          setAutoModeOutboundIndex((prev) => (isLoopLine ? prev + 1 : prev - 1))
        }

        if (index === stations.length - 1 && isLoopLine) {
          setAutoModeOutboundIndex(0)
        }

        if (next) {
          setLocation((prev) => ({
            ...prev,
            location: {
              coords: {
                latitude: next.latitude,
                longitude: next.longitude,
                accuracy: 0,
              },
            },
          }))
        }
      }
    }

    intervalInternal()

    const interval = setInterval(intervalInternal, AUTO_MODE_WHOLE_DURATION)
    setAutoModeArriveTimer(interval)
  }, [
    selectedDirection,
    enabled,
    autoModeArriveTimer,
    selectedLine,
    autoModeInboundIndexRef,
    stations,
    isLoopLine,
    setLocation,
    autoModeOutboundIndexRef,
  ])

  useEffect(() => {
    startArriveTimer()
  }, [startArriveTimer])

  useEffect(() => {
    return () => {
      if (autoModeApproachingTimer) {
        clearInterval(autoModeApproachingTimer)
      }
      if (autoModeArriveTimer) {
        clearInterval(autoModeArriveTimer)
      }
    }
  }, [autoModeApproachingTimer, autoModeArriveTimer])
}

export default useAutoMode

import { encode as btoa } from 'base-64'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { BleManager, Device } from 'react-native-ble-plx'
import {
  BLE_ENABLED,
  BLE_TARGET_CHARACTERISTIC_UUID,
  BLE_TARGET_LOCAL_NAME,
  BLE_TARGET_SERVICE_UUID,
} from 'react-native-dotenv'
import { useRecoilValue } from 'recoil'
import { Station } from '../gen/stationapi_pb'
import stationState from '../store/atoms/station'
import getIsPass from '../utils/isPass'
import useCurrentStation from './useCurrentStation'
import { useNextStation } from './useNextStation'
import useTransferLines from './useTransferLines'

const manager = new BleManager()

const useBLE = (): void => {
  const { arrived, approaching } = useRecoilValue(stationState)
  const deviceRef = useRef<Device>()
  const station = useCurrentStation()
  const nextStation = useNextStation()
  const transferLines = useTransferLines()

  const stateText = useMemo(() => {
    if (arrived && !getIsPass(station)) {
      return 'Now stopping at'
    }
    if (approaching && !getIsPass(station)) {
      return 'Soon'
    }
    return 'The next stop is'
  }, [approaching, arrived, station])

  const switchedStation = useMemo(
    () => (arrived && !getIsPass(station) ? station : nextStation),
    [arrived, nextStation, station]
  )

  const passingStation = useMemo(
    () => (arrived && getIsPass(station) ? station : null),
    [arrived, station]
  )

  const getStationNameWithNumber = useCallback((s: Station.AsObject) => {
    const stationNameR = s?.nameRoman
      ? s?.nameRoman
          .replaceAll('ō', 'o')
          .replaceAll('Ō', 'O')
          .replaceAll('ū', 'u')
          .replaceAll('Ū', 'U')
      : ''
    return s?.stationNumbersList[0]?.stationNumber
      ? `${stationNameR}(${s?.stationNumbersList[0]?.stationNumber})`
      : stationNameR
  }, [])

  const payloadStr = useMemo(() => {
    const linesStr = transferLines?.length
      ? transferLines
          .map((l) =>
            (l.nameRoman ?? '')
              .replaceAll('ō', 'o')
              .replaceAll('Ō', 'O')
              .replaceAll('ū', 'u')
              .replaceAll('Ū', 'U')
          )
          .filter((l, i, self) => self.indexOf(l) === i)
          .join('\n')
      : 'N/A'

    const stationNameWithNumber =
      switchedStation && getStationNameWithNumber(switchedStation)
    const passingStationNameWithNumber =
      passingStation && getStationNameWithNumber(passingStation)

    return btoa(
      `${stateText}${'\n'}${stationNameWithNumber}${'\n'}${'\n'}Transfer: ${'\n'}${linesStr}${
        passingStation ? `\n\nPassing:\n${passingStationNameWithNumber}` : ''
      }`
    )
  }, [
    getStationNameWithNumber,
    passingStation,
    stateText,
    switchedStation,
    transferLines,
  ])

  const scanAndConnect = useCallback(() => {
    manager.startDeviceScan(null, null, async (err, dev) => {
      if (err) {
        console.error(err)
        return
      }
      if (dev && dev.localName === BLE_TARGET_LOCAL_NAME) {
        deviceRef.current = await (
          await dev.connect()
        ).discoverAllServicesAndCharacteristics()
        manager.stopDeviceScan()
      }
    })
  }, [])

  useEffect(() => {
    if (
      !BLE_ENABLED ||
      !BLE_TARGET_SERVICE_UUID ||
      !BLE_TARGET_CHARACTERISTIC_UUID
    ) {
      return
    }

    if (deviceRef.current) {
      deviceRef.current.writeCharacteristicWithResponseForService(
        BLE_TARGET_SERVICE_UUID,
        BLE_TARGET_CHARACTERISTIC_UUID,
        payloadStr
      )
    }
  }, [deviceRef, payloadStr])

  useEffect(() => {
    if (BLE_ENABLED) {
      scanAndConnect()
    }
  }, [scanAndConnect])
}

export default useBLE

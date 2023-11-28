import { encode as btoa } from 'base-64'
import { useCallback, useEffect, useMemo, useState } from 'react'
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
  const [device, setDevice] = useState<Device | null>(null)
  const station = useCurrentStation()
  const nextStation = useNextStation()
  const transferAllLines = useTransferLines()
  const transferLines = transferAllLines

  const stateText = useMemo(() => {
    if (arrived && !getIsPass(station)) {
      return 'Now'
    }
    if (approaching && !getIsPass(station)) {
      return 'Soon'
    }
    return 'Next'
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
    return `${stationNameR}\n${
      s?.stationNumbersList[0]?.stationNumber ?? 'N/A'
    }`
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
          .join(', ')
      : 'N/A'

    const stationNameWithNumber =
      switchedStation && getStationNameWithNumber(switchedStation)

    if (!stationNameWithNumber) {
      return ''
    }

    return btoa(
      `${stateText}${'\n'}${stationNameWithNumber}${'\n'}${linesStr}${'\n'}${
        passingStation?.nameRoman ?? ''
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

      try {
        if (dev && dev.localName === BLE_TARGET_LOCAL_NAME) {
          setDevice(
            await (await dev.connect()).discoverAllServicesAndCharacteristics()
          )
          manager.stopDeviceScan()
        }
      } catch (err) {
        console.error(err)
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

    if (device && payloadStr.length) {
      device.writeCharacteristicWithoutResponseForService(
        BLE_TARGET_SERVICE_UUID,
        BLE_TARGET_CHARACTERISTIC_UUID,
        payloadStr
      )
    }
  }, [device, payloadStr])

  useEffect(() => {
    if (BLE_ENABLED) {
      scanAndConnect()
    }
  }, [scanAndConnect])
}

export default useBLE

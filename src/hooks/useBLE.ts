import { useCallback, useEffect } from 'react'
import BleManager from 'react-native-ble-manager'

const useBLE = () => {
  const scanAndConnect = useCallback(() => {
    BleManager.scan([], 5, false).then(async () => {
      const peripherals = await BleManager.getDiscoveredPeripherals()
      console.warn(peripherals)
      await BleManager.stopScan()
    })
  }, [])

  useEffect(() => {
    scanAndConnect()
  }, [scanAndConnect])
}

export default useBLE

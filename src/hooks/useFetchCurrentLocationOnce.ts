import { Platform } from 'react-native'
import { GOOGLE_GEOLOCATION_API_KEY } from 'react-native-dotenv'
import WifiManager from 'react-native-wifi-reborn'
import useSWRMutation from 'swr/dist/mutation'
import { setLocation, useLocationStore } from './useLocationStore'

type WifiAccessPoints = {
  macAddress: string
  signalStrength: number
  age: number
  channel: number
  signalToNoiseRatio: number
}

export const useFetchCurrentLocationOnce = () => {
  const lastKnownLocation = useLocationStore()

  const {
    isMutating: loading,
    error,
    trigger: fetchCurrentLocation,
  } = useSWRMutation(['/geolocation/v1/geolocate'], async () => {
    if (Platform.OS !== 'android' || lastKnownLocation) {
      return null
    }

    const wifiList = await WifiManager.loadWifiList()

    const wifiAccessPoints = wifiList.map<WifiAccessPoints>((ent) => ({
      macAddress: ent.BSSID,
      signalStrength: ent.level,
      age: 0,
      channel: ent.frequency,
      signalToNoiseRatio: 0,
    }))

    const url = `https://www.googleapis.com/geolocation/v1/geolocate?key=${GOOGLE_GEOLOCATION_API_KEY}`
    const res = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        wifiAccessPoints,
      }),
    })
    const json = await res.json()
    const { accuracy } = json
    const { lat: latitude, lng: longitude } = json.location

    setLocation({
      coords: {
        latitude,
        longitude,
        altitude: null,
        accuracy,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: 0,
    })

    return json
  })

  return { fetchCurrentLocation, loading, error }
}

import { LocationObject, LocationObjectCoords } from 'expo-location'
import { useEffect } from 'react'
import { Platform } from 'react-native'
import { GOOGLE_GEOLOCATION_API_KEY } from 'react-native-dotenv'
import WifiManager from 'react-native-wifi-reborn'
import { useRecoilState } from 'recoil'
import locationState from '../store/atoms/location'
import useFetchNearbyStation from './useFetchNearbyStation'

type WifiAccessPoints = {
  macAddress: string
  signalStrength: number
  age: number
  channel: number
  signalToNoiseRatio: number
}

export const useGoogleGeolocation = () => {
  const [{ location: locationFromState }, setLocationState] =
    useRecoilState(locationState)

  const fetchStationFunc = useFetchNearbyStation()

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return
    }

    const fetchWiFiListAsync = async () => {
      if (locationFromState) {
        return
      }

      const wifiList = await WifiManager.loadWifiList()
      const wifiAccessPoints = wifiList.map<WifiAccessPoints>((ent) => ({
        macAddress: ent.BSSID,
        signalStrength: ent.level,
        age: ent.timestamp,
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

      const location: LocationObject = {
        coords: { latitude, longitude, accuracy } as LocationObjectCoords,
        timestamp: new Date().getTime(),
      }

      setLocationState((prev) => ({ ...prev, location }))

      fetchStationFunc(location)
    }

    fetchWiFiListAsync()
  }, [fetchStationFunc, locationFromState, setLocationState])
}

import { LocationObjectCoords } from 'expo-location'
import { useCallback } from 'react'
import { Platform } from 'react-native'
import {
  GOOGLE_GEOLOCATION_API_KEY,
  LOCATION_FALLBACK_ENABLED,
} from 'react-native-dotenv'
import WifiManager from 'react-native-wifi-reborn'
import { useRecoilValue } from 'recoil'
import locationState from '../store/atoms/location'

type WifiAccessPoints = {
  macAddress: string
  signalStrength: number
  age: number
  channel: number
  signalToNoiseRatio: number
}

export const useGoogleGeolocation = () => {
  const { location: locationFromState } = useRecoilValue(locationState)

  const fetchLocationAndroid = useCallback(async () => {
    if (
      Platform.OS !== 'android' ||
      locationFromState ||
      LOCATION_FALLBACK_ENABLED === 'false'
    ) {
      return null
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

    return {
      coords: { latitude, longitude, accuracy } as LocationObjectCoords,
      timestamp: new Date().getTime(),
    }
  }, [locationFromState])

  return { fetchLocationAndroid }
}

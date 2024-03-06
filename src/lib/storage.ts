import AsyncStorage from '@react-native-async-storage/async-storage'
import Storage from 'react-native-storage'

export const storage = new Storage({
  storageBackend: AsyncStorage,
  defaultExpires: null,
})

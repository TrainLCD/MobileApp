import * as FileSystem from 'expo-file-system'
import { useCallback } from 'react'
import { TTS_CACHE_DIR } from '../constants'
import { storage } from '../lib/storage'

type TTSCacheData = {
  text: string
  path: string
}

const TTS_STORAGE_KEY = 'tts'

const useTTSCache = () => {
  const store = useCallback(async (id: string, text: string, path: string) => {
    await storage.save({
      key: TTS_STORAGE_KEY,
      id,
      data: { text, path },
    })

    if (process.env.NODE_ENV === 'development') {
      console.log('Stored into storage: ', id)
    }
  }, [])

  const getByText = useCallback(async (text: string): Promise<TTSCacheData> => {
    const cacheArray = await storage.getAllDataForKey(TTS_STORAGE_KEY)
    const data = cacheArray.find((item) => item.text === text)

    if (process.env.NODE_ENV === 'development') {
      if (data) {
        console.log('Found in cache: ', data)
      } else {
        console.log('Not found in cache: ', text)
      }
    }

    return data
  }, [])

  const clearCache = useCallback(async () => {
    await FileSystem.deleteAsync(TTS_CACHE_DIR)
    await storage.clearMapForKey(TTS_STORAGE_KEY)
  }, [])

  return { store, getByText, clearCache }
}

export default useTTSCache

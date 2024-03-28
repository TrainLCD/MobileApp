import * as FileSystem from 'expo-file-system'
import { useCallback } from 'react'
import { TTS_CACHE_DIR } from '../constants'
import { storage } from '../lib/storage'

type TTSCacheData = {
  id: string
  text: string
  path: string
}

const TTS_STORAGE_KEY = 'tts'

const useTTSCache = () => {
  const store = useCallback(async (id: string, text: string, path: string) => {
    await storage.save({
      key: TTS_STORAGE_KEY,
      id,
      data: { id, text, path },
    })

    if (process.env.NODE_ENV === 'development') {
      console.log('Stored into storage: ', id)
    }
  }, [])

  const getByText = useCallback(
    async (text: string): Promise<TTSCacheData | null> => {
      const cacheArray = await storage.getAllDataForKey(TTS_STORAGE_KEY)
      const data: TTSCacheData | null = cacheArray.find(
        (item) => item.text === text
      )

      if (data && !(await FileSystem.getInfoAsync(data.path)).exists) {
        await storage.remove({ key: TTS_STORAGE_KEY, id: data.id })
        if (process.env.NODE_ENV === 'development') {
          console.log('Removed from cache: ', data)
        }
        return null
      }

      if (process.env.NODE_ENV === 'development') {
        if (data) {
          console.log('Found in cache: ', data)
        } else {
          console.log('Not found in cache: ', text)
        }
      }

      return data
    },
    []
  )

  const clearCache = useCallback(async () => {
    await FileSystem.deleteAsync(
      `${FileSystem.documentDirectory}${TTS_CACHE_DIR}`
    )
    await storage.clearMapForKey(TTS_STORAGE_KEY)
  }, [])

  return { store, getByText, clearCache }
}

export default useTTSCache

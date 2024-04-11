// TODO: このファイルの処理がいらなくなりそうなタイミングで消す
import * as FileSystem from 'expo-file-system'
import { useCallback, useEffect } from 'react'
import { TTS_CACHE_DIR } from '../constants'
import { storage } from '../lib/storage'

const TTS_STORAGE_KEY = 'tts'

export const usePurgeTTSCache = () => {
  const clearCache = useCallback(async () => {
    const fsPath = `${FileSystem.documentDirectory}${TTS_CACHE_DIR}`

    const dirInfo = await FileSystem.getInfoAsync(fsPath)
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(fsPath)
    }
    await storage.clearMapForKey(TTS_STORAGE_KEY)
  }, [])

  useEffect(() => {
    clearCache()
  }, [clearCache])
}

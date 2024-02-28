import { useCallback } from 'react'
import { useRecoilValue } from 'recoil'
import cacheState, { TTSCacheBody } from '../store/atoms/cache'

const useTTSCache = () => {
  const { ttsCache } = useRecoilValue(cacheState)

  const store = useCallback(
    (text: string, path: string, id: string): string => {
      ttsCache.set(id, { path, text })

      if (process.env.NODE_ENV === 'development') {
        console.log('Stored in cache: ', id)
      }

      return id
    },
    [ttsCache]
  )

  // 多分使うことはない気がするが、IDで登録はしているので一応宣言しておく
  const get = useCallback(
    (id: string): TTSCacheBody | undefined => ttsCache.get(id),
    [ttsCache]
  )

  const getByText = useCallback(
    (text: string): TTSCacheBody | undefined => {
      const cacheArray = Array.from(ttsCache.values())
      const body = cacheArray.find((item) => item.text === text)

      if (process.env.NODE_ENV === 'development') {
        if (body) {
          const index = cacheArray.findIndex((item) => item.text === text)
          const id = Array.from(ttsCache.keys())[index]
          console.log('Found in cache: ', id)
        } else {
          console.log('Not found in cache: ', text)
        }
      }

      return body
    },
    [ttsCache]
  )

  return { store, get, getByText }
}

export default useTTSCache

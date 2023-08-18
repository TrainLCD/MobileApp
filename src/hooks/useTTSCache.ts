import { useCallback } from 'react'
import { useRecoilValue } from 'recoil'
import cacheState, { CacheBody } from '../store/atoms/cache'
import getUniqueId from '../utils/uniqueId'

const useTTSCache = () => {
  const { cache } = useRecoilValue(cacheState)

  const store = useCallback(
    (text: string, path: string, id?: string): string => {
      const uniqueId = getUniqueId()
      cache.set(id ?? uniqueId, { path, text })

      if (process.env.NODE_ENV === 'development') {
        console.warn('Stored in cache: ', id ?? uniqueId)
      }

      return id ?? uniqueId
    },
    [cache]
  )

  // 多分使うことはない気がするが、IDで登録はしているので一応宣言しておく
  const get = useCallback(
    (id: string): CacheBody | undefined => cache.get(id),
    [cache]
  )

  const getByText = useCallback(
    (text: string): CacheBody | undefined => {
      const cacheArray = Array.from(cache.values())
      const body = cacheArray.find((item) => item.text === text)

      if (process.env.NODE_ENV === 'development') {
        if (body) {
          const index = cacheArray.findIndex((item) => item.text === text)
          const id = Array.from(cache.keys())[index]
          console.warn('Found in cache: ', id)
        } else {
          console.warn('Not found in cache: ', `${text.substring(0, 50)}...`)
        }
      }

      return body
    },
    [cache]
  )

  return { store, get, getByText }
}

export default useTTSCache

import * as Linking from 'expo-linking'
import { useCallback, useEffect } from 'react'
import { useOpenRouteFromLink } from './useOpenRouteFromLink'

export const useDeepLink = () => {
  const { openLink: openRoute, isLoading, error } = useOpenRouteFromLink()

  const handleParsedUrl = useCallback(
    async (parsedUrl: Linking.ParsedURL) => {
      if (parsedUrl.queryParams) {
        const { sgid, dir, lgid, lid } = parsedUrl.queryParams

        const stationGroupId = Number(sgid)
        const direction = Number(dir)
        const lineGroupId = Number(lgid)
        const lineId = Number(lid)

        if (
          typeof stationGroupId === 'undefined' ||
          typeof direction === 'undefined'
        ) {
          return
        }
        if (direction !== 0 && direction !== 1) {
          return
        }

        openRoute({
          stationGroupId,
          direction,
          lineGroupId,
          lineId,
        })
      }
    },
    [openRoute]
  )

  const handleUrl = useCallback(
    (url: string) => handleParsedUrl(Linking.parse(url)),
    [handleParsedUrl]
  )

  useEffect(() => {
    const handleInitUrlAsync = async () => {
      const initialUrl = await Linking.parseInitialURLAsync()
      handleParsedUrl(initialUrl)
    }
    handleInitUrlAsync()

    const listener = Linking.addEventListener('url', (e) => handleUrl(e.url))

    return () => {
      listener.remove()
    }
  }, [handleParsedUrl, handleUrl])

  return { isLoading, error }
}

import * as Linking from 'expo-linking'
import { useCallback, useEffect } from 'react'
import { useOpenRouteFromLink } from './useOpenRouteFromLink'

export const useDeepLink = () => {
  const { openLink: openRoute } = useOpenRouteFromLink()

  const handleURL = useCallback(
    async (event: Linking.EventType) => {
      const url = event.url
      if (url && (await Linking.canOpenURL(url))) {
        const parsedUrl = Linking.parse(url)
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
      }
    },
    [openRoute]
  )

  useEffect(() => {
    const listener = Linking.addEventListener('url', handleURL)

    return () => {
      listener.remove()
    }
  }, [handleURL])
}

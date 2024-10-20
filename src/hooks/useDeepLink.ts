import * as Linking from 'expo-linking'
import { useEffect } from 'react'
import { useOpenRouteFromLink } from './useOpenRouteFromLink'

export const useDeepLink = () => {
  const url = Linking.useURL()
  const { openLink: openRoute } = useOpenRouteFromLink()

  useEffect(() => {
    const getUrlAsync = async () => {
      if (url && (await Linking.canOpenURL(url))) {
        const parsedUrl = Linking.parse(url)
        if (parsedUrl.queryParams) {
          const { gid, lid } = parsedUrl.queryParams
          openRoute(Number(gid), Number(lid))
        }
      }
    }
    getUrlAsync()
  }, [openRoute, url])
}

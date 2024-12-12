import React, { memo, ReactNode, useEffect } from 'react'
import { Alert } from 'react-native'
import Loading from '../components/Loading'
import { useDeepLink } from '../hooks/useDeepLink'
import { translate } from '../translation'

type Props = {
  children: ReactNode
}

const DeepLinkProvider = ({ children }: Props) => {
  const { isLoading: isRoutesLoadingByLink, error: fetchRoutesByLinkError } =
    useDeepLink()
  useEffect(() => {
    if (fetchRoutesByLinkError) {
      console.error(fetchRoutesByLinkError)
      Alert.alert(translate('errorTitle'), translate('failedToFetchStation'))
    }
  }, [fetchRoutesByLinkError])
  if (isRoutesLoadingByLink && !fetchRoutesByLinkError) {
    return <Loading message={translate('loadingAPI')} linkType="serverStatus" />
  }

  return children
}

export default memo(DeepLinkProvider)

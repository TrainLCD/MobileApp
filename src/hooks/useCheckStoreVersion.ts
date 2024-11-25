// FIXME: Expo SDK 52で react-native-version-check が使えなくなったので動くように修正する
const useCheckStoreVersion = (): void => {
  // const showUpdateRequestDialog = useCallback((storeURL: string) => {
  //   Alert.alert(
  //     translate('annoucementTitle'),
  //     translate('newVersionAvailableText'),
  //     [
  //       { text: translate('cancel'), style: 'cancel' },
  //       {
  //         text: translate('update'),
  //         style: 'destructive',
  //         onPress: () => {
  //           Linking.openURL(storeURL)
  //         },
  //       },
  //     ]
  //   )
  // }, [])
  // useEffect(() => {
  //   const f = async () => {
  //     if (__DEV__) {
  //       return
  //     }
  //     const res = await VersionCheck.needUpdate()
  //     if (res.isNeeded) {
  //       showUpdateRequestDialog(res.storeUrl)
  //     }
  //   }
  //   f()
  // }, [showUpdateRequestDialog])
}

export default useCheckStoreVersion

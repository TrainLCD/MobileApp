import { ConnectError } from '@connectrpc/connect'
import React from 'react'
import { Modal, SafeAreaView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Route } from '../../gen/proto/stationapi_pb'
import { LED_THEME_BG_COLOR } from '../constants'
import { useThemeStore } from '../hooks/useThemeStore'
import { APP_THEME } from '../models/Theme'
import { translate } from '../translation'
import isTablet from '../utils/isTablet'
import FAB from './FAB'
import Heading from './Heading'
import Loading from './Loading'
import { RouteList } from './RouteList'

type Props = {
  routes: Route[]
  visible: boolean
  isRoutesLoading: boolean
  isTrainTypesLoading: boolean
  error: ConnectError | null
  onClose: () => void
  onSelect: (route: Route | undefined) => void
}

const styles = StyleSheet.create({
  modalContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: '100%',
    height: '100%',
  },
  modalView: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 12,
  },
  loading: { marginTop: 12 },
})

const SAFE_AREA_FALLBACK = 32

export const RouteListModal: React.FC<Props> = ({
  routes,
  visible,
  isRoutesLoading,
  isTrainTypesLoading,
  onClose,
  onSelect,
}: Props) => {
  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED)
  const { left: leftSafeArea, right: rightSafeArea } = useSafeAreaInsets()

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
      supportedOrientations={['landscape']}
    >
      <View style={styles.modalContainer}>
        <SafeAreaView
          style={[
            styles.modalView,
            {
              backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : '#fff',
            },
            isTablet
              ? {
                  width: '80%',
                  maxHeight: '90%',
                  shadowOpacity: 0.25,
                  shadowColor: '#000',
                  borderRadius: 16,
                }
              : {
                  width: '100%',
                  height: '100%',
                  paddingLeft: leftSafeArea || SAFE_AREA_FALLBACK,
                  paddingRight: rightSafeArea || SAFE_AREA_FALLBACK,
                },
          ]}
        >
          <View
            style={{
              width: '100%',
              height: '100%',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                marginVertical: 16,
              }}
            >
              <Heading>{translate('trainTypeSettings')}</Heading>
            </View>
            <View
              style={{
                flex: 1,
                width: '100%',
                height: '100%',
              }}
            >
              {isRoutesLoading ? (
                <Loading message={translate('loadingAPI')} />
              ) : (
                <View
                  style={{ flex: 1, opacity: isTrainTypesLoading ? 0.5 : 1 }}
                >
                  <RouteList
                    routes={routes}
                    onSelect={onSelect}
                    loading={isTrainTypesLoading}
                  />
                </View>
              )}
            </View>
          </View>
        </SafeAreaView>
        <FAB onPress={onClose} icon="close" />
      </View>
    </Modal>
  )
}

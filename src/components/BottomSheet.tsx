import {
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
  SNAP_POINT_TYPE,
} from '@gorhom/bottom-sheet'
import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { SafeAreaView, StyleSheet, TouchableOpacity } from 'react-native'
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useThemeStore } from '../hooks/useThemeStore'
import { APP_THEME } from '../models/Theme'
import { translate } from '../translation'
import Button from './Button'

type Props = {
  open: boolean
  onDismiss: () => void
  onChange?: (index: number, position: number, type: SNAP_POINT_TYPE) => void
  // NOTE: 各アクション
  onBackPress: () => void
  onSharePress: () => void
  onReportPress: () => void
}

const CustomBackdrop = ({ animatedIndex, style }: BottomSheetBackdropProps) => {
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      animatedIndex.value,
      [-1, 0],
      [0, 0.5],
      Extrapolation.CLAMP
    ),
  }))

  const containerStyle = useMemo(
    () => [
      style,
      {
        backgroundColor: 'black',
      },
      containerAnimatedStyle,
    ],
    [style, containerAnimatedStyle]
  )

  return <Animated.View style={containerStyle} />
}

export const BottomSheet = ({
  open,
  onChange,
  onDismiss,
  onBackPress,
  onReportPress,
  onSharePress,
}: Props) => {
  const bottomSheetModalRef = useRef<BottomSheetModal>(null)
  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED)

  const BackdropComponent = useCallback(
    (props: BottomSheetBackdropProps) => {
      return (
        <TouchableOpacity
          activeOpacity={1}
          style={StyleSheet.absoluteFill}
          onPress={onDismiss}
        >
          <CustomBackdrop {...props} />
        </TouchableOpacity>
      )
    },
    [onDismiss]
  )

  useEffect(() => {
    if (open) {
      bottomSheetModalRef.current?.present()
    } else {
      bottomSheetModalRef.current?.close()
    }
  }, [open])

  const { bottom: safeAreaBottom } = useSafeAreaInsets()

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      backdropComponent={BackdropComponent}
      onChange={onChange}
      onDismiss={onDismiss}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: isLEDTheme ? 'black' : '#fcfcfc' }}
      handleIndicatorStyle={
        isLEDTheme && {
          backgroundColor: '#1f1f1f',
        }
      }
      handleStyle={{
        backgroundColor: isLEDTheme ? 'black' : undefined,
      }}
      style={
        !isLEDTheme && {
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
        }
      }
    >
      <BottomSheetView style={styles.contentContainer}>
        <SafeAreaView
          style={{
            width: '100%',
            flexDirection: 'row',
            flexWrap: 'wrap',
            marginBottom: safeAreaBottom,
            justifyContent: 'center',
            gap: 12,
          }}
        >
          <Button onPress={onBackPress}>{translate('back')}</Button>
          <Button onPress={onSharePress}>{translate('share')}</Button>
          <Button onPress={onReportPress}>{translate('report')}</Button>
        </SafeAreaView>
      </BottomSheetView>
    </BottomSheetModal>
  )
}

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    alignItems: 'center',
  },
})

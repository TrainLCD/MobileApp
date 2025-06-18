import {
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../hooks/useThemeStore';
import { APP_THEME } from '../models/Theme';
import Heading from './Heading';

type Props = {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onDismiss: () => void;
};

const CustomBackdrop = ({ animatedIndex, style }: BottomSheetBackdropProps) => {
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      animatedIndex.value,
      [-1, 0],
      [0, 0.5],
      Extrapolation.CLAMP
    ),
  }));

  const containerStyle = useMemo(
    () => [
      style,
      {
        backgroundColor: 'black',
      },
      containerAnimatedStyle,
    ],
    [style, containerAnimatedStyle]
  );

  return <Animated.View style={containerStyle} />;
};

export const HalfModal = ({ open, title, children, onDismiss }: Props) => {
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED);
  const { height: windowHeight } = useWindowDimensions();

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
      );
    },
    [onDismiss]
  );

  useEffect(() => {
    if (open) {
      bottomSheetModalRef.current?.present();
    } else {
      bottomSheetModalRef.current?.close();
    }
  }, [open]);

  const { bottom: safeAreaBottom } = useSafeAreaInsets();
  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      backdropComponent={BackdropComponent}
      onDismiss={onDismiss}
      enablePanDownToClose
      enableDynamicSizing={false}
      snapPoints={['90%']}
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
      maxDynamicContentSize={windowHeight * 0.8}
    >
      <BottomSheetView style={styles.contentContainer}>
        <SafeAreaView
          style={{
            width: '100%',
            marginBottom: safeAreaBottom,
          }}
        >
          <Heading style={{ marginBottom: 8 }}>{title}</Heading>
          <View
            style={{
              width: '100%',
              gap: 12,
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            {children}
          </View>
        </SafeAreaView>
      </BottomSheetView>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    alignItems: 'center',
  },
});

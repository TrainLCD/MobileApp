import React, { cloneElement, useCallback, useMemo, useRef } from 'react'
import { Animated, Easing, ScrollView, StyleSheet, View } from 'react-native'

type Props = {
  children: React.ReactElement
}

const styles = StyleSheet.create({
  container: { flex: 1 },
})

const Marquee = ({ children }: Props) => {
  const wrapperViewRef = useRef<View>(null)
  const offsetX = useRef(new Animated.Value(0))

  const startScroll = useCallback((width: number) => {
    offsetX.current.setValue(width / 3)
    Animated.loop(
      Animated.timing(offsetX.current, {
        toValue: -width,
        duration: width * 3,
        useNativeDriver: true,
        easing: Easing.linear,
      })
    ).start()
  }, [])

  const childrenCloned = useMemo(
    () =>
      cloneElement(children, {
        ...children.props,
        style: {
          ...children.props.style,
        },
        onLayout: ({
          nativeEvent: {
            layout: { width },
          },
        }: {
          nativeEvent: { layout: { width: number } }
        }) => {
          startScroll(width)
        },
        ref: wrapperViewRef,
      }),
    [children, startScroll]
  )

  return (
    <ScrollView
      style={styles.container}
      horizontal
      showsHorizontalScrollIndicator={false}
      scrollEnabled={false}
      bounces={false}
    >
      <Animated.View
        style={{
          transform: [
            {
              translateX: offsetX.current,
            },
          ],
        }}
      >
        {childrenCloned}
      </Animated.View>
    </ScrollView>
  )
}

export default React.memo(Marquee)

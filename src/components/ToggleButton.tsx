import { useCallback } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Icon } from 'react-native-paper';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Typography from './Typography';

type Props = {
  isActive: boolean;
  children: React.ReactNode;
  icon: string;
  value?: string;
  onPress: () => void;
};

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

export const ToggleButton = ({
  isActive,
  icon,
  children,
  onPress,
  value,
}: Props) => {
  const scale = useSharedValue(1);

  const animatedButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: withTiming(
            scale.value,
            {
              duration: 100,
              easing: Easing.inOut(Easing.quad),
              reduceMotion: ReduceMotion.System,
            },
            (finished) => {
              if (finished) {
                scale.value = 1;
              }
            }
          ),
        },
      ],
    };
  });

  const handlePress = useCallback(() => {
    scale.value = 0.9;
    onPress();
  }, [onPress, scale]);

  return (
    <AnimatedTouchableOpacity
      onPress={handlePress}
      activeOpacity={1}
      style={[
        {
          backgroundColor: 'white',
          width: 100,
          height: 100,
          alignItems: 'center',
          justifyContent: 'center',
          elevation: 4,
          shadowColor: 'black',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          flexDirection: 'column',
          borderRadius: 8,
        },
        animatedButtonStyle,
      ]}
    >
      <View
        style={{
          width: '100%',
          height: 68,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 4,
          backgroundColor: 'white',
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
        }}
      >
        <Icon source={icon} size={24} color="#008ffe" />
        <Typography
          style={{ color: '#008ffe', fontWeight: 'bold', marginTop: 8 }}
        >
          {children}
        </Typography>
      </View>
      <View
        style={{
          width: '100%',
          height: 32,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: isActive ? '#008ffe' : '#afafaf',
          padding: 4,
          borderBottomLeftRadius: 8,
          borderBottomRightRadius: 8,
        }}
      >
        <Typography style={{ fontWeight: 'bold', color: 'white' }}>
          {value ?? (isActive ? 'オン' : 'オフ')}
        </Typography>
      </View>
    </AnimatedTouchableOpacity>
  );
};

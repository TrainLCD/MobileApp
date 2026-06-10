import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Platform } from 'react-native';

// iOS 26+ かつ Xcode 26 ビルドでのみ true。Android や旧 iOS では各コンポーネントが従来表現へフォールバックする
export const LIQUID_GLASS_AVAILABLE =
  Platform.OS === 'ios' && isLiquidGlassAvailable();

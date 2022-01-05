import { Platform } from 'react-native';
import { PickerStyle } from 'react-native-picker-select';
import { RFValue } from 'react-native-responsive-fontsize';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const usePickerStyle = (): PickerStyle => {
  const { left: safeAreaLeft, right: safeAreaRight } = useSafeAreaInsets();

  return {
    inputIOS: {
      fontSize: RFValue(12),
    },
    viewContainer: {
      borderWidth: 1,
      borderColor: '#aaa',
      borderRadius: 4,
      padding: Platform.OS === 'ios' ? 12 : 0,
      marginTop: 24,
      marginLeft: safeAreaLeft,
      marginRight: safeAreaRight,
    },
    done: {
      marginRight: safeAreaRight,
    },
  } as PickerStyle;
};

export default usePickerStyle;

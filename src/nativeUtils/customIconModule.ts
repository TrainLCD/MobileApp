import { NativeModules, Platform } from 'react-native';

const { CustomIconModule } = NativeModules;

const changeAppIcon = (name: 'AppIconDev' | null): Promise<void> => {
  if (Platform.OS === 'ios') {
    return CustomIconModule.changeAppIcon(name);
  }
  return Promise.resolve();
};

export default changeAppIcon;

import * as Notifications from 'expo-notifications';
import { NativeModules, Platform } from 'react-native';

const { SensitiveNotificationModule } = NativeModules;

const ELIGIBLE_PLATFORM =
  Platform.OS === 'ios' && parseFloat(Platform.Version) >= 15.0;

const sendNotificationAsync = async ({
  title,
  body,
}: {
  title: string;
  body: string;
}): Promise<unknown> => {
  if (ELIGIBLE_PLATFORM) {
    return SensitiveNotificationModule.sendNotification(title, body);
  }
  return Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger: null,
  });
};

export default sendNotificationAsync;

import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { apiRequest } from '@/lib/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerNativePush(): Promise<'registered' | 'unsupported' | 'denied'> {
  if (!Device.isDevice || (Platform.OS !== 'android' && Platform.OS !== 'ios')) return 'unsupported';

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('level-os-reminders', {
      name: 'Lembretes do Level OS',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 180, 100, 180],
    });
  }

  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return 'denied';

  const deviceToken = await Notifications.getDevicePushTokenAsync();
  await apiRequest('/api/push-devices.php', {
    method: 'POST',
    bodyJson: {
      action: 'register',
      platform: Platform.OS,
      token: String(deviceToken.data),
    },
  });
  return 'registered';
}

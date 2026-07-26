import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { levelTheme } from '@/constants/level-theme';
import { useAuth } from '@/providers/auth-provider';

export default function EntryScreen() {
  const { loading, session } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={levelTheme.colors.primary} size="large" />
      </View>
    );
  }

  return <Redirect href={session ? '/(app)' : '/login'} />;
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    backgroundColor: levelTheme.colors.background,
    flex: 1,
    justifyContent: 'center',
  },
});

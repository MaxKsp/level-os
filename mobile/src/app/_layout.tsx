import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { LevelBackground } from '@/components/level-background';
import { levelTheme } from '@/constants/level-theme';
import { AuthProvider } from '@/providers/auth-provider';

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: levelTheme.colors.primary,
    background: levelTheme.colors.background,
    card: levelTheme.colors.surface,
    border: levelTheme.colors.border,
    text: levelTheme.colors.text,
    notification: levelTheme.colors.danger,
  },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={navigationTheme}>
      <View style={styles.root}>
        <LevelBackground />
        <AuthProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              animation: 'fade',
              contentStyle: styles.transparent,
              headerShown: false,
            }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="forgot-password" />
            <Stack.Screen name="reset-password" />
            <Stack.Screen name="(app)" />
          </Stack>
        </AuthProvider>
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: levelTheme.colors.background,
    flex: 1,
  },
  transparent: {
    backgroundColor: 'transparent',
  },
});

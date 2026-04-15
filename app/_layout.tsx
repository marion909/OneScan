import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Constants from 'expo-constants';

export default function RootLayout() {
  const [splashVisible, setSplashVisible] = useState(true);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => setSplashVisible(false));
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const version = Constants.expoConfig?.version ?? '1.0.0';
  const router = useRouter();

  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#1a5c9a' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: '700', fontSize: 15, letterSpacing: 0.5 },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'PATIENTENDATEN',
            headerBackVisible: false,
            headerRight: () => (
              <TouchableOpacity onPress={() => router.push('/settings')} style={styles.gearButton}>
                <Text style={styles.gearIcon}>⚙</Text>
              </TouchableOpacity>
            ),
          }}
        />
        <Stack.Screen name="scan" options={{ title: 'DOKUMENT SCANNEN', headerBackTitle: 'Zurück' }} />
        <Stack.Screen name="confirm" options={{ title: 'BESTÄTIGEN', headerBackTitle: 'Zurück' }} />
        <Stack.Screen name="settings" options={{ title: 'EINSTELLUNGEN', headerBackTitle: 'Zurück' }} />
      </Stack>

      {splashVisible && (
        <Animated.View style={[styles.splash, { opacity }]}>
          <Text style={styles.appName}>OneScan</Text>
          <Image
            source={require('../assets/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.version}>v{version}</Text>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  splash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a5c9a',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 24,
    letterSpacing: 2,
  },
  logo: {
    width: 120,
    height: 120,
  },
  version: {
    marginTop: 24,
    fontSize: 14,
    color: '#a0c4e8',
  },
  gearButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  gearIcon: {
    fontSize: 22,
    color: '#ffffff',
  },
});

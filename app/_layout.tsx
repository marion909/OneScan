import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Slot, useRouter } from 'expo-router';
import { isConfigured } from '../services/settingsService';

export default function RootLayout() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const configured = await isConfigured();
      if (!active) return;
      setChecking(false);
      if (!configured) {
        // Beim ersten Start direkt zu den Einstellungen weiterleiten
        router.replace('/settings');
      }
    })();
    return () => { active = false; };
  }, []);

  if (checking) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#005EB8" />
      </View>
    );
  }

  return <Slot />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
});

import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#fff' },
        headerTintColor: colorScheme === 'dark' ? '#fff' : '#000',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'OneScan' }} />
      <Stack.Screen name="scan" options={{ title: 'Scannen', headerBackTitle: 'Zurück' }} />
      <Stack.Screen name="confirm" options={{ title: 'Bestätigen', headerBackTitle: 'Zurück' }} />
      <Stack.Screen name="settings" options={{ title: 'Einstellungen', headerBackTitle: 'Zurück' }} />
    </Stack>
  );
}

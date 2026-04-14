import { useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DocumentScanner from 'react-native-document-scanner-plugin';

export default function ScanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ patient: string }>();

  useEffect(() => {
    startScan();
  }, []);

  const startScan = async () => {
    try {
      const { status, scans } = await DocumentScanner.scanDocument({
        croppedImageQuality: 100,
        maxNumDocuments: 1,
      });

      if (status === 'success' && scans && scans.length > 0) {
        router.replace({
          pathname: '/confirm',
          params: {
            patient: params.patient,
            imageUri: scans[0].croppedImage,
          },
        });
      } else {
        router.back();
      }
    } catch (err: any) {
      Alert.alert('Scan-Fehler', err?.message ?? 'Unbekannter Fehler');
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Scanner wird gestartet</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  text: {
    color: '#fff',
    fontSize: 16,
  },
});

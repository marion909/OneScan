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
        // User cancelled — go back
        router.back();
      }
    } catch (err: any) {
      Alert.alert('Scan-Fehler', err?.message ?? 'Unbekannter Fehler');
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Scanner wird gestartet…</Text>
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
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DocumentScanner, { ResponseType, ScanDocumentResponseStatus } from 'react-native-document-scanner-plugin';

export default function ScanScreen() {
  const router = useRouter();
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const [scanning, setScanning] = useState(false);

  const handleScan = async () => {
    setScanning(true);
    try {
      // expo-camera fügt CAMERA-Permission zum Manifest hinzu → manuell anfordern
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Kamerazugriff erforderlich', 'Bitte Kamerazugriff in den Einstellungen erlauben.');
          return;
        }
      }

      // Native Dokumentenscanner starten (1 Seite, Base64-Ausgabe)
      const { scannedImages, status } = await DocumentScanner.scanDocument({
        maxNumDocuments: 1,
        responseType: ResponseType.Base64,
        croppedImageQuality: 85,
      });

      if (status === ScanDocumentResponseStatus.Cancel) {
        router.back();
        return;
      }

      if (!scannedImages || scannedImages.length === 0) {
        Alert.alert('Fehler', 'Kein Bild aufgenommen.');
        return;
      }

      router.push({
        pathname: '/confirm',
        params: {
          patientId: patientId ?? '',
          jpegBase64: scannedImages[0],
          cornersJson: '',
        },
      });
    } catch (e) {
      Alert.alert('Fehler', e instanceof Error ? e.message : 'Unbekannter Fehler');
    } finally {
      setScanning(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dokument scannen</Text>
      <Text style={styles.subtitle}>
        Patient: <Text style={styles.patientId}>{patientId}</Text>
      </Text>

      <TouchableOpacity
        style={[styles.scanBtn, scanning && styles.scanBtnDisabled]}
        onPress={handleScan}
        disabled={scanning}
      >
        {scanning
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.scanBtnText}>Scan starten</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backBtnText}>Zurück</Text>
      </TouchableOpacity>
    </View>
  );
}

const BLUE = '#005EB8';

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#F5F7FA', justifyContent: 'center', alignItems: 'center', gap: 20, paddingHorizontal: 32 },
  title:           { fontSize: 22, fontWeight: '700', color: '#1A1A2E' },
  subtitle:        { fontSize: 14, color: '#666' },
  patientId:       { fontWeight: '700', color: '#1A1A2E' },
  scanBtn: {
    backgroundColor: BLUE,
    width: '100%', paddingVertical: 18,
    borderRadius: 14, alignItems: 'center',
  },
  scanBtnDisabled: { opacity: 0.5 },
  scanBtnText:     { color: '#fff', fontWeight: '700', fontSize: 18 },
  backBtn:         { paddingVertical: 8 },
  backBtnText:     { color: '#888', fontSize: 14 },
});


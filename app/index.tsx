import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';

type Mode = 'qr' | 'manual';

export default function IndexScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<Mode>('qr');
  const [manualId, setManualId] = useState('');
  const [scanned, setScanned] = useState(false);

  const handleBarCode = useCallback(({ data }: { data: string }) => {
    if (scanned) return;
    const trimmed = data.trim();
    if (!trimmed) return;
    setScanned(true);
    navigateToScan(trimmed);
  }, [scanned]);

  const navigateToScan = (patientId: string) => {
    router.push({ pathname: '/scan', params: { patientId } });
  };

  const handleManualSubmit = () => {
    Keyboard.dismiss();
    const trimmed = manualId.trim();
    if (!trimmed) {
      Alert.alert('Eingabe fehlt', 'Bitte eine Patienten-ID eingeben.');
      return;
    }
    if (!/^[a-zA-Z0-9_\-]+$/.test(trimmed)) {
      Alert.alert('Ungültige ID', 'Nur Buchstaben, Ziffern, - und _ erlaubt.');
      return;
    }
    navigateToScan(trimmed);
  };

  const requestCameraIfNeeded = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert(
          'Kamerazugriff erforderlich',
          'Bitte Kamerazugriff in den Systemeinstellungen erlauben.'
        );
        return;
      }
    }
    setMode('qr');
    setScanned(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>OneScan</Text>
        <Text style={styles.subtitle}>Patientendaten erfassen</Text>
      </View>

      {/* Mode Toggle */}
      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggleBtn, mode === 'qr' && styles.toggleActive]}
          onPress={() => { setScanned(false); requestCameraIfNeeded(); }}
        >
          <Text style={[styles.toggleText, mode === 'qr' && styles.toggleTextActive]}>QR-Code</Text>
        </Pressable>
        <Pressable
          style={[styles.toggleBtn, mode === 'manual' && styles.toggleActive]}
          onPress={() => setMode('manual')}
        >
          <Text style={[styles.toggleText, mode === 'manual' && styles.toggleTextActive]}>Manuelle Eingabe</Text>
        </Pressable>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {mode === 'qr' ? (
          <>
            {permission?.granted ? (
              <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={handleBarCode}
              >
                <View style={styles.scanOverlay}>
                  <View style={styles.scanFrame} />
                  <Text style={styles.scanHint}>QR-Code in den Rahmen halten</Text>
                </View>
              </CameraView>
            ) : (
              <View style={styles.permissionBox}>
                <Text style={styles.permissionText}>
                  Kamerazugriff wird benötigt.
                </Text>
                <TouchableOpacity style={styles.btn} onPress={requestCameraIfNeeded}>
                  <Text style={styles.btnText}>Zugriff erlauben</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          <View style={styles.manualBox}>
            <Text style={styles.label}>Patienten-ID</Text>
            <TextInput
              style={styles.input}
              value={manualId}
              onChangeText={setManualId}
              placeholder="z. B. 123456"
              keyboardType="default"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleManualSubmit}
            />
            <TouchableOpacity style={styles.btn} onPress={handleManualSubmit}>
              <Text style={styles.btnText}>Weiter</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Settings Link */}
      <TouchableOpacity style={styles.settingsLink} onPress={() => router.push('/settings')}>
        <Text style={styles.settingsLinkText}>⚙ Einstellungen</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const BLUE = '#005EB8';

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#F5F7FA' },
  header:          { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 16 },
  title:           { fontSize: 28, fontWeight: '700', color: BLUE },
  subtitle:        { fontSize: 15, color: '#555', marginTop: 4 },
  toggleRow:       { flexDirection: 'row', marginHorizontal: 24, marginBottom: 16, borderRadius: 10, overflow: 'hidden', borderWidth: 1.5, borderColor: BLUE },
  toggleBtn:       { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: '#fff' },
  toggleActive:    { backgroundColor: BLUE },
  toggleText:      { color: BLUE, fontWeight: '600', fontSize: 14 },
  toggleTextActive:{ color: '#fff' },
  content:         { flex: 1, marginHorizontal: 24, borderRadius: 14, overflow: 'hidden' },
  camera:          { flex: 1 },
  scanOverlay:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scanFrame:       {
    width: 220, height: 220,
    borderWidth: 3, borderColor: '#00C864', borderRadius: 12,
    backgroundColor: 'transparent',
  },
  scanHint:        { color: '#fff', marginTop: 16, fontSize: 14, fontWeight: '500' },
  permissionBox:   { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  permissionText:  { color: '#555', fontSize: 15, textAlign: 'center' },
  manualBox:       { flex: 1, justifyContent: 'center', gap: 12, paddingHorizontal: 8 },
  label:           { fontSize: 14, fontWeight: '600', color: '#333' },
  input:           {
    backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: '#ccc', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 18, color: '#111',
  },
  btn: {
    backgroundColor: BLUE,
    paddingVertical: 14, borderRadius: 10,
    alignItems: 'center',
  },
  btnText:         { color: '#fff', fontWeight: '700', fontSize: 16 },
  settingsLink:    { padding: 20, alignItems: 'center' },
  settingsLinkText:{ color: '#888', fontSize: 13 },
});

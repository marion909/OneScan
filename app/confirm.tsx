import { useState } from 'react';
import { View, Image, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import { Patient } from '../types/Patient';
import { loadSettings } from '../services/settingsService';
import { buildGdtContent } from '../services/gdtService';
import { writeFiles } from '../modules/smb-writer';

export default function ConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ patient: string; imageUri: string }>();
  const [isSending, setIsSending] = useState(false);

  const patient: Patient = JSON.parse(params.patient ?? '{}');
  const imageUri = params.imageUri ?? '';

  const handleConfirm = async () => {
    setIsSending(true);
    try {
      const settings = await loadSettings();
      if (!settings) {
        Alert.alert('Fehler', 'Bitte zuerst die SMB-Einstellungen konfigurieren.');
        setIsSending(false);
        return;
      }

      // Read JPEG as base64
      const jpegBase64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Build GDT content and encode as base64
      const gdtContent = buildGdtContent(patient);
      const gdtBase64 = btoa(unescape(encodeURIComponent(gdtContent)));

      // File names
      const ts = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
      const jpegName = `${patient.id}_${ts}.jpg`;
      const gdtName = `${patient.id}_${ts}.gdt`;

      await writeFiles(
        settings.uncPath,
        settings.username,
        settings.password,
        settings.domain ?? '',
        jpegBase64,
        gdtBase64,
        jpegName,
        gdtName,
      );

      Alert.alert('Erfolg', 'Dokument wurde erfolgreich übertragen.', [
        { text: 'OK', onPress: () => router.replace('/') },
      ]);
    } catch (err: any) {
      Alert.alert('Fehler', err?.message ?? 'Unbekannter Fehler beim Übertragen.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.patientInfo}>
        {patient.lastName}, {patient.firstName} — {patient.id}
      </Text>

      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
      ) : null}

      {isSending ? (
        <ActivityIndicator size="large" color="#007AFF" style={styles.spinner} />
      ) : (
        <>
          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
            <Text style={styles.confirmButtonText}>Senden</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
            <Text style={styles.cancelButtonText}>Erneut scannen</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  patientInfo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  preview: {
    width: '100%',
    height: 480,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    marginBottom: 24,
  },
  spinner: {
    marginTop: 32,
  },
  confirmButton: {
    backgroundColor: '#34C759',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 48,
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  cancelButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%',
  },
  cancelButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
});

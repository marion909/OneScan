import { useState } from 'react';
import { View, Image, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import { Patient } from '../types/Patient';
import { loadSettings } from '../services/settingsService';
import { buildGdtContent } from '../services/gdtService';
import { writeFiles } from '../modules/smb-writer';

export default function ConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ patient: string; imageUri?: string; imageUris?: string; mode?: string }>();
  const [isSending, setIsSending] = useState(false);
  const [description, setDescription] = useState('Eingescanntes Dokument');

  const patient: Patient = JSON.parse(params.patient ?? '{}');
  const mode = params.mode ?? 'photo';
  const imageUri = params.imageUri ?? '';
  const imageUris: string[] = params.imageUris ? JSON.parse(params.imageUris) : [];

  const previewUri = mode === 'scan' ? (imageUris[0] ?? '') : imageUri;
  const pageCount = imageUris.length;

  const handleConfirm = async () => {
    setIsSending(true);
    try {
      const settings = await loadSettings();
      if (!settings) {
        Alert.alert('Fehler', 'Bitte zuerst die SMB-Einstellungen konfigurieren.');
        setIsSending(false);
        return;
      }

      // Demo mode: simulate success without any real transfer
      if (settings.demoMode) {
        await new Promise((r) => setTimeout(r, 1200));
        Alert.alert('Demo-Modus', 'Übertragung simuliert (kein echtes Senden).', [
          { text: 'OK', onPress: () => router.dismissAll() },
        ]);
        return;
      }

      const ts = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
      const uncBase = settings.uncPath.replace(/[/\\]+$/, '');

      let fileBase64: string;
      let fileName: string;

      if (mode === 'scan') {
        // Build multi-page PDF from scanned images
        const pageHtml = await Promise.all(
          imageUris.map(async (uri, i) => {
            const b64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
            const breakAfter = i < imageUris.length - 1 ? 'always' : 'avoid';
            return `<div style="page-break-after:${breakAfter};margin:0;padding:0;"><img src="data:image/jpeg;base64,${b64}" style="width:100%;display:block;" /></div>`;
          })
        );
        const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;">${pageHtml.join('')}</body></html>`;
        const { uri: pdfUri } = await Print.printToFileAsync({ html });
        fileBase64 = await FileSystem.readAsStringAsync(pdfUri, { encoding: 'base64' });
        await FileSystem.deleteAsync(pdfUri, { idempotent: true });
        fileName = `${patient.id}_${ts}.pdf`;
      } else {
        // Single JPG
        fileBase64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: 'base64',
        });
        fileName = `${patient.id}_${ts}.jpg`;
      }

      const fileUncPath = `${uncBase}\\${fileName}`;
      const gdtName = `${patient.id}_${ts}.gdt`;
      const gdtContent = buildGdtContent(patient, fileUncPath, description);
      const gdtBase64 = btoa(unescape(encodeURIComponent(gdtContent)));

      await writeFiles(
        settings.uncPath,
        settings.username,
        settings.password,
        settings.domain ?? '',
        fileBase64,
        gdtBase64,
        fileName,
        gdtName,
      );

      Alert.alert('Erfolg', 'Dokument wurde erfolgreich übertragen.', [
        { text: 'OK', onPress: () => router.dismissAll() },
      ]);
    } catch (err: any) {
      Alert.alert('Fehler', err?.message ?? 'Unbekannter Fehler beim Übertragen.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.patientBanner}>
        <Text style={styles.patientBannerLabel}>PATIENT</Text>
        <Text style={styles.patientInfo}>
          {patient.lastName}, {patient.firstName} — ID: {patient.id}
        </Text>
      </View>

      {mode === 'scan' && pageCount > 0 && (
        <View style={styles.pageBadge}>
          <Text style={styles.pageBadgeText}>{pageCount} Seite{pageCount !== 1 ? 'n' : ''} · PDF</Text>
        </View>
      )}

      <View style={styles.descriptionContainer}>
        <Text style={styles.descriptionLabel}>BESCHREIBUNG</Text>
        <TextInput
          style={styles.descriptionInput}
          value={description}
          onChangeText={setDescription}
          placeholder="Dokumentbeschreibung"
          placeholderTextColor="#8a9aaa"
        />
      </View>

      {previewUri ? (
        <Image source={{ uri: previewUri }} style={styles.preview} resizeMode="contain" />
      ) : null}

      {isSending ? (
        <ActivityIndicator size="large" color="#0d6ebd" style={styles.spinner} />
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
    backgroundColor: '#f0f2f5',
    alignItems: 'center',
  },
  patientBanner: {
    width: '100%',
    backgroundColor: '#dbe8f6',
    borderWidth: 1,
    borderColor: '#9bbbd8',
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  patientBannerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1a5c9a',
    letterSpacing: 1,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  patientInfo: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a2733',
  },
  pageBadge: {
    backgroundColor: '#0d6ebd',
    borderRadius: 3,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  pageBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  preview: {
    width: '100%',
    height: 480,
    borderRadius: 4,
    backgroundColor: '#e8edf2',
    borderWidth: 1,
    borderColor: '#c5cdd5',
    marginBottom: 20,
  },
  spinner: {
    marginTop: 32,
  },
  descriptionContainer: {
    width: '100%',
    marginBottom: 14,
  },
  descriptionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5a6a7a',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  descriptionInput: {
    backgroundColor: '#f7f9fb',
    borderWidth: 1,
    borderColor: '#c5cdd5',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 15,
    color: '#1a2733',
  },
  confirmButton: {
    backgroundColor: '#0d6ebd',
    borderRadius: 4,
    paddingVertical: 13,
    paddingHorizontal: 48,
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  cancelButton: {
    borderRadius: 4,
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#0d6ebd',
  },
  cancelButtonText: {
    color: '#0d6ebd',
    fontSize: 14,
    fontWeight: '600',
  },
});


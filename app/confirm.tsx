import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { buildBaseFileName, buildGDTRecord, encodeGDTRecord } from '../services/gdtService';
import { loadSettings } from '../services/settingsService';
import { writeFiles } from '../modules/smb-writer';
import type { Corners } from '../types/Corners';

type Status = 'idle' | 'uploading' | 'success' | 'error';

export default function ConfirmScreen() {
  const router = useRouter();
  const { patientId, jpegBase64, cornersJson } = useLocalSearchParams<{
    patientId: string;
    jpegBase64: string;
    cornersJson: string;
  }>();

  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const corners: Corners | null = cornersJson ? JSON.parse(cornersJson) : null;

  const baseFileName = useRef(buildBaseFileName(patientId ?? 'UNBEKANNT')).current;
  const jpegFileName = `${baseFileName}.jpg`;
  const gdtRecord    = useRef(buildGDTRecord(patientId ?? 'UNBEKANNT', jpegFileName)).current;

  const handleSend = async () => {
    if (status === 'uploading') return;
    setStatus('uploading');
    setErrorMsg('');

    try {
      const settings = await loadSettings();
      if (!settings) {
        throw new Error('Keine UNC-Einstellungen gefunden. Bitte zuerst konfigurieren.');
      }
      if (!jpegBase64) {
        throw new Error('Bilddaten fehlen.');
      }

      const gdtBytes = encodeGDTRecord(gdtRecord);
      await writeFiles(
        settings,
        jpegBase64,
        gdtBytes,
        jpegFileName,
        gdtRecord.gdtFileName
      );

      setStatus('success');
    } catch (e) {
      setStatus('error');
      setErrorMsg(e instanceof Error ? e.message : 'Unbekannter Fehler');
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Preview */}
      {jpegBase64 ? (
        <Image
          source={{ uri: `data:image/jpeg;base64,${jpegBase64}` }}
          style={styles.preview}
          resizeMode="contain"
        />
      ) : (
        <View style={[styles.preview, styles.previewPlaceholder]}>
          <Text style={styles.placeholderText}>Kein Bild</Text>
        </View>
      )}

      {/* Info */}
      <View style={styles.infoCard}>
        <InfoRow label="Patient-ID"    value={patientId ?? '—'} />
        <InfoRow label="Bild-Datei"    value={jpegFileName} />
        <InfoRow label="GDT-Datei"     value={gdtRecord.gdtFileName} />
        <InfoRow label="GDT-Version"   value="2.1 (Satzart 6311)" />
        {corners && (
          <InfoRow label="Ecken"       value="Dokument erkannt ✓" />
        )}
      </View>

      {/* Aktionen */}
      {status === 'idle' && (
        <>
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
            <Text style={styles.sendBtnText}>Senden & Speichern</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={styles.cancelBtnText}>Zurück zum Scan</Text>
          </TouchableOpacity>
        </>
      )}

      {status === 'uploading' && (
        <View style={styles.statusBox}>
          <ActivityIndicator size="large" color="#005EB8" />
          <Text style={styles.statusText}>Wird übertragen…</Text>
        </View>
      )}

      {status === 'success' && (
        <View style={styles.statusBox}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.statusText}>Erfolgreich gespeichert!</Text>
          <TouchableOpacity
            style={styles.sendBtn}
            onPress={() => router.replace('/')}
          >
            <Text style={styles.sendBtnText}>Zurück zum Start</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === 'error' && (
        <View style={styles.statusBox}>
          <Text style={styles.errorIcon}>✕</Text>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
            <Text style={styles.sendBtnText}>Erneut versuchen</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.replace('/')}>
            <Text style={styles.cancelBtnText}>Abbrechen</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const BLUE = '#005EB8';
const { width: SCREEN_W } = Dimensions.get('window');

const styles = StyleSheet.create({
  scroll:             { flex: 1, backgroundColor: '#F5F7FA' },
  container:          { padding: 20, paddingBottom: 60, gap: 16 },
  preview: {
    width: SCREEN_W - 40, height: (SCREEN_W - 40) * 1.41, // A4-Verhältnis
    borderRadius: 12, backgroundColor: '#ddd',
    alignSelf: 'center',
  },
  previewPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  placeholderText:    { color: '#888', fontSize: 15 },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 8,
    elevation: 3, gap: 10,
  },
  infoRow:            { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  infoLabel:          { color: '#888', fontSize: 13, flex: 0.45 },
  infoValue:          { color: '#111', fontSize: 13, fontWeight: '600', flex: 0.55, textAlign: 'right' },
  sendBtn: {
    backgroundColor: BLUE,
    paddingVertical: 15, borderRadius: 12, alignItems: 'center',
  },
  sendBtnText:        { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelBtn:          { alignItems: 'center', paddingVertical: 10 },
  cancelBtnText:      { color: '#888', fontSize: 14 },
  statusBox: {
    alignItems: 'center', gap: 14, paddingVertical: 8,
  },
  statusText:         { color: '#333', fontSize: 16 },
  successIcon:        { fontSize: 56, color: '#00A050' },
  errorIcon:          { fontSize: 56, color: '#CC2200' },
  errorText:          { color: '#CC2200', fontSize: 14, textAlign: 'center' },
});

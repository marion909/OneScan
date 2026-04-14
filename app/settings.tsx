import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { loadSettings, saveSettings } from '../services/settingsService';
import { testConnection } from '../modules/smb-writer';
import type { UNCSettings } from '../types/Settings';
import { EMPTY_SETTINGS } from '../types/Settings';

type TestStatus = 'idle' | 'testing' | 'success' | 'failure';

export default function SettingsScreen() {
  const router = useRouter();
  const [form, setForm] = useState<UNCSettings>(EMPTY_SETTINGS);
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadSettings().then(s => {
      if (s) setForm(s);
      setLoaded(true);
    });
  }, []);

  const update = (key: keyof UNCSettings) => (val: string) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const [testError, setTestError] = useState('');

  const update = (key: keyof UNCSettings) => (val: string) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const handleTest = async () => {
    if (!form.uncPath.trim()) {
      Alert.alert('Pflichtfeld', 'Bitte UNC-Pfad eingeben.');
      return;
    }
    setTestStatus('testing');
    setTestError('');
    try {
      await testConnection(form);
      setTestStatus('success');
    } catch (e) {
      setTestStatus('failure');
      setTestError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleSave = async () => {
    if (!form.uncPath.trim()) {
      Alert.alert('Pflichtfeld', 'Bitte UNC-Pfad eingeben.');
      return;
    }
    setSaving(true);
    try {
      await saveSettings(form);
      Alert.alert('Gespeichert', 'Einstellungen wurden gespeichert.', [
        { text: 'OK', onPress: () => router.replace('/') },
      ]);
    } catch (e) {
      Alert.alert('Fehler', e instanceof Error ? e.message : 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#005EB8" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Einstellungen</Text>
        <Text style={styles.subheading}>UNC-Pfad & Zugangsdaten</Text>

        {/* UNC Pfad */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>UNC-Pfad <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={form.uncPath}
            onChangeText={update('uncPath')}
            placeholder="\\\\Server\\Freigabe\\Unterordner"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.hint}>Beispiel: \\\\MeinServer\\Scans\\Praxis</Text>
        </View>

        {/* Benutzername */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Benutzername</Text>
          <TextInput
            style={styles.input}
            value={form.username}
            onChangeText={update('username')}
            placeholder="Benutzername"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Passwort */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Passwort</Text>
          <TextInput
            style={styles.input}
            value={form.password}
            onChangeText={update('password')}
            placeholder="Passwort"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Domain */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Domäne <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput
            style={styles.input}
            value={form.domain}
            onChangeText={update('domain')}
            placeholder="WORKGROUP oder DOMÄNE"
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </View>

        {/* Verbindungstest */}
        <TouchableOpacity
          style={[styles.testBtn, testStatus === 'testing' && styles.btnDisabled]}
          onPress={handleTest}
          disabled={testStatus === 'testing'}
        >
          {testStatus === 'testing'
            ? <ActivityIndicator color="#005EB8" />
            : <Text style={styles.testBtnText}>Verbindung testen</Text>
          }
        </TouchableOpacity>

        {testStatus === 'success' && (
          <View style={[styles.statusBox, styles.statusSuccess]}>
            <Text style={styles.statusSuccessText}>✓ Verbindung erfolgreich</Text>
          </View>
        )}
        {testStatus === 'failure' && (
          <View style={[styles.statusBox, styles.statusError]}>
            <Text style={styles.statusErrorText}>
              ✕ Verbindung fehlgeschlagen{'\n'}
              {testError || 'Prüfe Pfad, Zugangsdaten und Netzwerk (Port 445).'}
            </Text>
          </View>
        )}

        {/* Speichern */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.btnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>Einstellungen speichern</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
          <Text style={styles.backBtnText}>Zurück</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const BLUE = '#005EB8';

const styles = StyleSheet.create({
  scroll:          { flex: 1, backgroundColor: '#F5F7FA' },
  loading:         { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container:       { padding: 24, paddingBottom: 60, gap: 12 },
  heading:         { fontSize: 26, fontWeight: '700', color: BLUE, marginBottom: 2 },
  subheading:      { fontSize: 14, color: '#666', marginBottom: 8 },
  fieldGroup:      { gap: 4 },
  label:           { fontSize: 13, fontWeight: '600', color: '#333' },
  required:        { color: '#CC2200' },
  optional:        { color: '#888', fontWeight: '400' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#111',
  },
  hint:            { fontSize: 11, color: '#999', marginTop: 2 },
  testBtn: {
    borderWidth: 2, borderColor: BLUE,
    paddingVertical: 13, borderRadius: 10,
    alignItems: 'center', marginTop: 8,
  },
  testBtnText:     { color: BLUE, fontWeight: '700', fontSize: 15 },
  statusBox:       { borderRadius: 10, padding: 14 },
  statusSuccess:   { backgroundColor: '#E6F9EE' },
  statusError:     { backgroundColor: '#FDECEA' },
  statusSuccessText:{ color: '#00703C', fontWeight: '600', fontSize: 14 },
  statusErrorText: { color: '#CC2200', fontSize: 14, lineHeight: 20 },
  saveBtn: {
    backgroundColor: BLUE,
    paddingVertical: 15, borderRadius: 12,
    alignItems: 'center', marginTop: 8,
  },
  saveBtnText:     { color: '#fff', fontWeight: '700', fontSize: 16 },
  btnDisabled:     { opacity: 0.5 },
  backBtn:         { alignItems: 'center', paddingVertical: 10 },
  backBtnText:     { color: '#888', fontSize: 14 },
});

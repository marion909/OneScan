import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator, Switch } from 'react-native';
import { loadSettings, saveSettings } from '../services/settingsService';
import { Settings } from '../types/Settings';
import { testConnection } from '../modules/smb-writer';

export default function SettingsScreen() {
  const [uncPath, setUncPath] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [domain, setDomain] = useState('');
  const [gdtInputUncPath, setGdtInputUncPath] = useState('');
  const [gdtInputFileName, setGdtInputFileName] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings().then((s) => {
      if (s) {
        setUncPath(s.uncPath);
        setUsername(s.username);
        setPassword(s.password);
        setDomain(s.domain ?? '');
        setGdtInputUncPath(s.gdtInputUncPath ?? '');
        setGdtInputFileName(s.gdtInputFileName ?? '');
        setDemoMode(s.demoMode ?? false);
      }
    });
  }, []);

  const handleSave = async () => {
    if (!uncPath.trim() || !username.trim()) {
      Alert.alert('Fehler', 'UNC-Pfad und Benutzername sind Pflichtfelder.');
      return;
    }
    setIsSaving(true);
    try {
      const settings: Settings = {
        uncPath: uncPath.trim(),
        username: username.trim(),
        password: password.trim(),
        domain: domain.trim() || undefined,
        gdtInputUncPath: gdtInputUncPath.trim() || undefined,
        gdtInputFileName: gdtInputFileName.trim() || undefined,
        demoMode,
      };
      await saveSettings(settings);
      Alert.alert('Gespeichert', 'Einstellungen wurden gespeichert.');
    } catch (err: any) {
      Alert.alert('Fehler', err?.message ?? 'Speichern fehlgeschlagen.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!uncPath.trim() || !username.trim()) {
      Alert.alert('Fehler', 'Bitte UNC-Pfad und Benutzername eingeben.');
      return;
    }
    setIsTesting(true);
    try {
      const ok = await testConnection(uncPath.trim(), username.trim(), password.trim(), domain.trim());
      if (ok) {
        Alert.alert('Verbindung OK', 'Die Verbindung zum SMB-Share war erfolgreich.');
      } else {
        Alert.alert('Verbindung fehlgeschlagen', 'Die Verbindung konnte nicht hergestellt werden.');
      }
    } catch (err: any) {
      Alert.alert('Fehler', err?.message ?? 'Verbindungstest fehlgeschlagen.');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>

      {/* ── GDT-Ausgabe ── */}
      <Text style={styles.sectionTitle}>GDT-Ausgabe (AIS)</Text>
      <Text style={styles.sectionHint}>Zielordner für gescannte Dokumente und GDT-Rückmeldungen.</Text>

      <Text style={styles.label}>Ausgabe-Pfad (UNC) *</Text>
      <TextInput
        style={styles.input}
        value={uncPath}
        onChangeText={setUncPath}
        placeholder="\\\\server\\freigabe"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={styles.label}>Benutzername *</Text>
      <TextInput
        style={styles.input}
        value={username}
        onChangeText={setUsername}
        placeholder="Benutzer"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={styles.label}>Passwort</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Passwort"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={styles.label}>Domain (optional)</Text>
      <TextInput
        style={styles.input}
        value={domain}
        onChangeText={setDomain}
        placeholder="WORKGROUP"
        autoCapitalize="characters"
        autoCorrect={false}
      />

      {/* ── GDT-Eingang ── */}
      <Text style={styles.sectionTitle}>GDT-Eingang (AIS)</Text>
      <Text style={styles.sectionHint}>Quelldatei mit Patientendaten aus dem AIS.</Text>

      <Text style={styles.label}>Ordner-Pfad (UNC)</Text>
      <TextInput
        style={styles.input}
        value={gdtInputUncPath}
        onChangeText={setGdtInputUncPath}
        placeholder="\\\\server\\freigabe\\gdt"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={styles.label}>Dateiname</Text>
      <TextInput
        style={styles.input}
        value={gdtInputFileName}
        onChangeText={setGdtInputFileName}
        placeholder="TURBO.GDT"
        autoCapitalize="none"
        autoCorrect={false}
      />

      {/* ── Demo-Modus ── */}
      <Text style={styles.sectionTitle}>Demo-Modus</Text>
      <View style={styles.demoRow}>
        <Text style={styles.demoLabel}>Demo-Modus aktivieren</Text>
        <Switch
          value={demoMode}
          onValueChange={setDemoMode}
          trackColor={{ false: '#ccc', true: '#FF9500' }}
          thumbColor="#fff"
        />
      </View>
      {demoMode && (
        <Text style={styles.demoHint}>
          Aktiv: QR-Scan und GDT-Einlesen liefern Testdaten. Es werden keine Dateien übertragen.
        </Text>
      )}

      {/* ── Aktionen ── */}
      {isSaving || isTesting ? (
        <ActivityIndicator size="large" color="#007AFF" style={styles.spinner} />
      ) : (
        <>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Einstellungen speichern</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.testButton} onPress={handleTest}>
            <Text style={styles.testButtonText}>Verbindung testen</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
    marginTop: 32,
  },
  sectionHint: {
    fontSize: 13,
    color: '#888',
    marginBottom: 4,
    lineHeight: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#222',
  },
  spinner: {
    marginTop: 32,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 32,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  testButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  testButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  demoLabel: {
    fontSize: 16,
    color: '#222',
  },
  demoHint: {
    fontSize: 13,
    color: '#888',
    marginTop: 8,
    lineHeight: 18,
  },
});

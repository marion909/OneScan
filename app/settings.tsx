import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator, Switch } from 'react-native';
import { loadSettings, saveSettings } from '../services/settingsService';
import { Settings } from '../types/Settings';
import { testConnection } from '../modules/smb-writer';

function SectionCard({
  iconColor,
  iconLabel,
  title,
  children,
}: {
  iconColor: string;
  iconLabel: string;
  title: string;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(true);
  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardHeader} onPress={() => setExpanded((v) => !v)} activeOpacity={0.7}>
        <View style={[styles.sectionIcon, { backgroundColor: iconColor }]}>
          <Text style={styles.sectionIconText}>{iconLabel}</Text>
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.chevron}>{expanded ? '∧' : '∨'}</Text>
      </TouchableOpacity>
      {expanded && <View style={styles.cardBody}>{children}</View>}
    </View>
  );
}

export default function SettingsScreen() {
  const [uncPath, setUncPath] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [domain, setDomain] = useState('');
  const [gdtInputUncPath, setGdtInputUncPath] = useState('');
  const [gdtInputFileName, setGdtInputFileName] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const [hideQrButton, setHideQrButton] = useState(false);
  const [hideGdtButton, setHideGdtButton] = useState(false);
  const [disableManualInput, setDisableManualInput] = useState(false);
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
        setHideQrButton(s.hideQrButton ?? false);
        setHideGdtButton(s.hideGdtButton ?? false);
        setDisableManualInput(s.disableManualInput ?? false);
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
        hideQrButton,
        hideGdtButton,
        disableManualInput,
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
      <SectionCard iconColor="#FF9500" iconLabel="→" title="GDT-Ausgabe (AIS)">
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
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, styles.inputFlex]}
            value={password}
            onChangeText={setPassword}
            placeholder="Passwort"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword((v) => !v)}>
            <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Domain (optional)</Text>
        <TextInput
          style={styles.input}
          value={domain}
          onChangeText={setDomain}
          placeholder="WORKGROUP"
          autoCapitalize="characters"
          autoCorrect={false}
        />
      </SectionCard>

      {/* ── GDT-Eingang ── */}
      <SectionCard iconColor="#FF9500" iconLabel="←" title="GDT-Eingang (AIS)">
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
      </SectionCard>

      {/* ── Demo-Modus ── */}
      <SectionCard iconColor="#e53935" iconLabel="!" title="Demo-Modus">
        <View style={styles.demoRow}>
          <Text style={styles.demoLabel}>Demo-Modus aktivieren</Text>
          <Switch
            value={demoMode}
            onValueChange={setDemoMode}
            trackColor={{ false: '#c5cdd5', true: '#e8910a' }}
            thumbColor="#fff"
          />
        </View>
        {demoMode && (
          <View style={styles.demoAlert}>
            <Text style={styles.demoAlertIcon}>⚠</Text>
            <Text style={styles.demoAlertText}>
              Aktiv: QR-Scan und GDT-Einlesen liefern Testdaten. Es werden keine Dateien übertragen.
            </Text>
          </View>
        )}
      </SectionCard>

      {/* ── Oberfläche ── */}
      <SectionCard iconColor="#007AFF" iconLabel="☰" title="Oberfläche">
        <View style={styles.demoRow}>
          <Text style={styles.demoLabel}>QR-Code-Button ausblenden</Text>
          <Switch
            value={hideQrButton}
            onValueChange={setHideQrButton}
            trackColor={{ false: '#c5cdd5', true: '#1a5c9a' }}
            thumbColor="#fff"
          />
        </View>
        <View style={[styles.demoRow, { marginTop: 12 }]}>
          <Text style={styles.demoLabel}>GDT-einlesen-Button ausblenden</Text>
          <Switch
            value={hideGdtButton}
            onValueChange={setHideGdtButton}
            trackColor={{ false: '#c5cdd5', true: '#1a5c9a' }}
            thumbColor="#fff"
          />
        </View>
        <View style={[styles.demoRow, { marginTop: 12 }]}>
          <Text style={styles.demoLabel}>Manuelle Eingabe deaktivieren</Text>
          <Switch
            value={disableManualInput}
            onValueChange={setDisableManualInput}
            trackColor={{ false: '#c5cdd5', true: '#1a5c9a' }}
            thumbColor="#fff"
          />
        </View>
        {disableManualInput && (
          <View style={styles.demoAlert}>
            <Text style={styles.demoAlertIcon}>ℹ</Text>
            <Text style={styles.demoAlertText}>
              Felder sind schreibgeschützt. Daten können nur via QR-Code oder GDT eingelesen werden.
            </Text>
          </View>
        )}
      </SectionCard>

      {/* ── Aktionen ── */}
      {isSaving || isTesting ? (
        <ActivityIndicator size="large" color="#0d6ebd" style={styles.spinner} />
      ) : (
        <>
          <TouchableOpacity style={styles.testButton} onPress={handleTest}>
            <Text style={styles.testButtonText}>Verbindung testen</Text>
            <Text style={styles.testButtonIcon}>⊡</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Einstellungen speichern</Text>
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
    gap: 12,
  },
  // ── Section Card ──
  card: {
    backgroundColor: '#fff',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#c5cdd5',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: '#f0f2f5',
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionIconText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  cardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#1a2733',
    letterSpacing: 0.3,
  },
  chevron: {
    fontSize: 14,
    color: '#5a6a7a',
    fontWeight: '600',
  },
  cardBody: {
    paddingHorizontal: 14,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#c5cdd5',
  },
  // ── Fields ──
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5a6a7a',
    marginBottom: 4,
    marginTop: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#f7f9fb',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#c5cdd5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1a2733',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputFlex: {
    flex: 1,
  },
  eyeButton: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#f7f9fb',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#c5cdd5',
  },
  eyeIcon: {
    fontSize: 16,
  },
  // ── Demo ──
  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  demoLabel: {
    fontSize: 14,
    color: '#1a2733',
    flex: 1,
    paddingRight: 8,
  },
  demoAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff8e1',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ffe082',
    padding: 10,
    marginTop: 12,
    gap: 8,
  },
  demoAlertIcon: {
    fontSize: 14,
    color: '#e8910a',
  },
  demoAlertText: {
    flex: 1,
    fontSize: 12,
    color: '#6d4c00',
    lineHeight: 17,
  },
  // ── Buttons ──
  spinner: {
    marginTop: 16,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#0d6ebd',
    backgroundColor: '#fff',
    gap: 8,
    marginTop: 4,
  },
  testButtonText: {
    color: '#0d6ebd',
    fontSize: 14,
    fontWeight: '600',
  },
  testButtonIcon: {
    color: '#0d6ebd',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#0d6ebd',
    borderRadius: 4,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});

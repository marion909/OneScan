import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Patient } from '../types/Patient';
import { loadSettings } from '../services/settingsService';
import { parseGdtContent } from '../services/gdtService';
import { readFile } from '../modules/smb-writer';

const DEMO_PATIENT = { id: '99001', lastName: 'Demo-Patient', firstName: 'Max', birthDate: '01011980' };

export default function IndexScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [qrScanned, setQrScanned] = useState(false);
  const [isLoadingGdt, setIsLoadingGdt] = useState(false);

  const [patientId, setPatientId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');

  const [hideQrButton, setHideQrButton] = useState(false);
  const [hideGdtButton, setHideGdtButton] = useState(false);
  const [disableManualInput, setDisableManualInput] = useState(false);

  // Load UI visibility settings on mount
  useEffect(() => {
    loadSettings().then((s) => {
      if (s) {
        setHideQrButton(s.hideQrButton ?? false);
        setHideGdtButton(s.hideGdtButton ?? false);
        setDisableManualInput(s.disableManualInput ?? false);
      }
    });
  }, []);

  const handleOpenQrScanner = async () => {
    const settings = await loadSettings();
    if (settings?.demoMode) {
      setPatientId(DEMO_PATIENT.id);
      setLastName(DEMO_PATIENT.lastName);
      setFirstName(DEMO_PATIENT.firstName);
      setBirthDate(DEMO_PATIENT.birthDate);
      return;
    }
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Berechtigung', 'Kamerazugriff wird für den QR-Scanner benötigt.');
        return;
      }
    }
    setQrScanned(false);
    setShowQrScanner(true);
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (qrScanned) return;
    setQrScanned(true);
    setShowQrScanner(false);
    // Expected format: PatientID;Nachname;Vorname;TTMMJJJJ
    const parts = data.split(';');
    if (parts.length >= 2) {
      setPatientId(parts[0]?.trim() ?? '');
      setLastName(parts[1]?.trim() ?? '');
      setFirstName(parts[2]?.trim() ?? '');
      setBirthDate(parts[3]?.trim() ?? '');
    } else {
      Alert.alert('Unbekanntes Format', `QR-Inhalt:\n${data}`);
    }
  };

  const handleLoadGdt = async () => {
    setIsLoadingGdt(true);
    try {
      const settings = await loadSettings();
      if (settings?.demoMode) {
        setPatientId(DEMO_PATIENT.id);
        setLastName(DEMO_PATIENT.lastName);
        setFirstName(DEMO_PATIENT.firstName);
        setBirthDate(DEMO_PATIENT.birthDate);
        return;
      }
      if (!settings?.gdtInputUncPath || !settings?.gdtInputFileName) {
        Alert.alert('Einstellungen fehlen', 'Bitte GDT-Pfad und Dateiname in den Einstellungen konfigurieren.');
        return;
      }
      const content = await readFile(
        settings.gdtInputUncPath,
        settings.username,
        settings.password,
        settings.domain ?? '',
        settings.gdtInputFileName,
      );
      const patient = parseGdtContent(content);
      if (!patient.id && !patient.lastName) {
        Alert.alert('Kein Patient', 'In der GDT-Datei wurden keine Patientendaten gefunden.');
        return;
      }
      setPatientId(patient.id ?? '');
      setLastName(patient.lastName ?? '');
      setFirstName(patient.firstName ?? '');
      setBirthDate(patient.birthDate ?? '');
    } catch (err: any) {
      Alert.alert('Fehler', err?.message ?? 'GDT-Datei konnte nicht gelesen werden.');
    } finally {
      setIsLoadingGdt(false);
    }
  };

  const getPatient = (): Patient | null => {
    if (!patientId.trim() || !lastName.trim()) {
      Alert.alert('Fehler', 'Bitte Patienten-ID und Nachname eingeben.');
      return null;
    }
    return {
      id: patientId.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      birthDate: birthDate.trim(),
    };
  };

  const handleScanDoc = () => {
    const patient = getPatient();
    if (!patient) return;
    router.push({ pathname: '/scan', params: { patient: JSON.stringify(patient), mode: 'scan' } });
  };

  const handlePhoto = () => {
    const patient = getPatient();
    if (!patient) return;
    router.push({ pathname: '/scan', params: { patient: JSON.stringify(patient), mode: 'photo' } });
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.buttonRow}>
          {!hideQrButton && (
            <TouchableOpacity style={[styles.qrButton, styles.rowButton]} onPress={handleOpenQrScanner}>
              <Text style={styles.qrButtonText}>QR-Code</Text>
            </TouchableOpacity>
          )}
          {!hideGdtButton && (
            isLoadingGdt ? (
              <ActivityIndicator size="small" color="#FF9500" style={styles.rowButton} />
            ) : (
              <TouchableOpacity style={[styles.gdtButton, styles.rowButton]} onPress={handleLoadGdt}>
                <Text style={styles.gdtButtonText}>GDT einlesen</Text>
              </TouchableOpacity>
            )
          )}
        </View>

        <Text style={styles.label}>Patienten-ID *</Text>
        <TextInput
          style={[styles.input, disableManualInput && styles.inputDisabled]}
          value={patientId}
          onChangeText={setPatientId}
          placeholder="z.B. 123456"
          keyboardType="numeric"
          autoCapitalize="none"
          editable={!disableManualInput}
        />

        <Text style={styles.label}>Nachname *</Text>
        <TextInput
          style={[styles.input, disableManualInput && styles.inputDisabled]}
          value={lastName}
          onChangeText={setLastName}
          placeholder="Mustermann"
          autoCapitalize="words"
          editable={!disableManualInput}
        />

        <Text style={styles.label}>Vorname</Text>
        <TextInput
          style={[styles.input, disableManualInput && styles.inputDisabled]}
          value={firstName}
          onChangeText={setFirstName}
          placeholder="Max"
          autoCapitalize="words"
          editable={!disableManualInput}
        />

        <Text style={styles.label}>Geburtsdatum (TTMMJJJJ)</Text>
        <TextInput
          style={[styles.input, disableManualInput && styles.inputDisabled]}
          value={birthDate}
          onChangeText={setBirthDate}
          placeholder="01011980"
          keyboardType="numeric"
          maxLength={8}
          editable={!disableManualInput}
        />

        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionButton, styles.scanDocButton]} onPress={handleScanDoc}>
            <Text style={styles.actionButtonText}>Dokument scannen</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.photoButton]} onPress={handlePhoto}>
            <Text style={styles.actionButtonText}>Bild erstellen</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      <Modal visible={showQrScanner} animationType="slide" onRequestClose={() => setShowQrScanner(false)}>
        <View style={styles.scannerContainer}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            onBarcodeScanned={handleBarcodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          />
          <TouchableOpacity style={styles.closeButton} onPress={() => setShowQrScanner(false)}>
            <Text style={styles.closeButtonText}>Abbrechen</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#f0f2f5',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  rowButton: {
    flex: 1,
    borderRadius: 4,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrButton: {
    backgroundColor: '#e3effc',
    borderWidth: 1,
    borderColor: '#0d6ebd',
  },
  gdtButton: {
    backgroundColor: '#fff3e0',
    borderWidth: 1,
    borderColor: '#e8910a',
  },
  gdtButtonText: {
    color: '#e8910a',
    fontSize: 13,
    fontWeight: '700',
  },
  qrButtonText: {
    color: '#0d6ebd',
    fontSize: 13,
    fontWeight: '700',
  },
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
    fontSize: 15,
    color: '#1a2733',
  },
  inputDisabled: {
    backgroundColor: '#eef0f3',
    color: '#8a9bac',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 28,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#c5cdd5',
  },
  actionButton: {
    flex: 1,
    borderRadius: 4,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanDocButton: {
    backgroundColor: '#0d6ebd',
  },
  photoButton: {
    backgroundColor: '#2e8b57',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  settingsButton: {
    borderRadius: 4,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  settingsButtonText: {
    color: '#0d6ebd',
    fontSize: 15,
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  closeButton: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 4,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

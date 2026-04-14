import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Patient } from '../types/Patient';

export default function IndexScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [qrScanned, setQrScanned] = useState(false);

  const [patientId, setPatientId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');

  const handleOpenQrScanner = async () => {
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

  const handleScan = () => {
    if (!patientId.trim() || !lastName.trim()) {
      Alert.alert('Fehler', 'Bitte Patienten-ID und Nachname eingeben.');
      return;
    }

    const patient: Patient = {
      id: patientId.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      birthDate: birthDate.trim(),
    };

    router.push({ pathname: '/scan', params: { patient: JSON.stringify(patient) } });
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.qrButton} onPress={handleOpenQrScanner}>
          <Text style={styles.qrButtonText}>QR-Code scannen</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Patienten-ID *</Text>
        <TextInput
          style={styles.input}
          value={patientId}
          onChangeText={setPatientId}
          placeholder="z.B. 123456"
          keyboardType="numeric"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Nachname *</Text>
        <TextInput
          style={styles.input}
          value={lastName}
          onChangeText={setLastName}
          placeholder="Mustermann"
          autoCapitalize="words"
        />

        <Text style={styles.label}>Vorname</Text>
        <TextInput
          style={styles.input}
          value={firstName}
          onChangeText={setFirstName}
          placeholder="Max"
          autoCapitalize="words"
        />

        <Text style={styles.label}>Geburtsdatum (TTMMJJJJ)</Text>
        <TextInput
          style={styles.input}
          value={birthDate}
          onChangeText={setBirthDate}
          placeholder="01011980"
          keyboardType="numeric"
          maxLength={8}
        />

        <TouchableOpacity style={styles.scanButton} onPress={handleScan}>
          <Text style={styles.scanButtonText}>Dokument scannen</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingsButton} onPress={() => router.push('/settings')}>
          <Text style={styles.settingsButtonText}>Einstellungen</Text>
        </TouchableOpacity>
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
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  qrButton: {
    backgroundColor: '#34C759',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  qrButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
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
  scanButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 32,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  settingsButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  settingsButtonText: {
    color: '#007AFF',
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
    borderRadius: 30,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

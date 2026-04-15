import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import DocumentScanner from 'react-native-document-scanner-plugin';

export default function ScanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ patient: string; mode: string }>();
  const mode = params.mode ?? 'scan';
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [permissionRequested, setPermissionRequested] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // Request permission on mount for both modes, then proceed
  useEffect(() => {
    (async () => {
      const result = await requestPermission();
      setPermissionRequested(true);
      if (!result.granted) {
        Alert.alert('Berechtigung fehlt', 'Kamerazugriff wird für diese Funktion benötigt.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
        return;
      }
      if (mode === 'scan') {
        startDocScan();
      }
    })();
  }, []);

  const startDocScan = async () => {
    try {
      const { status, scannedImages } = await DocumentScanner.scanDocument({
        croppedImageQuality: 100,
        maxNumDocuments: 20,
      });

      if (status === 'success' && scannedImages && scannedImages.length > 0) {
        router.replace({
          pathname: '/confirm',
          params: {
            patient: params.patient,
            mode: 'scan',
            imageUris: JSON.stringify(scannedImages),
          },
        });
      } else {
        router.back();
      }
    } catch (err: any) {
      Alert.alert('Scan-Fehler', err?.message ?? 'Unbekannter Fehler');
      router.back();
    }
  };

  const takePhoto = async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 1 });
      if (photo?.uri) {
        router.replace({
          pathname: '/confirm',
          params: { patient: params.patient, mode: 'photo', imageUri: photo.uri },
        });
      } else {
        setIsCapturing(false);
      }
    } catch (err: any) {
      Alert.alert('Fehler', err?.message ?? 'Foto konnte nicht aufgenommen werden.');
      setIsCapturing(false);
    }
  };

  if (mode === 'photo') {
    if (!permissionRequested || !permission?.granted) {
      return (
        <View style={styles.container}>
          <Text style={styles.text}>Kamerazugriff wird angefragt …</Text>
        </View>
      );
    }
    return (
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFillObject} facing="back" />
        <View style={styles.captureArea}>
          <TouchableOpacity
            style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
            onPress={takePhoto}
            disabled={isCapturing}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Scanner wird gestartet …</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f2f5',
  },
  text: {
    color: '#1a2733',
    fontSize: 15,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  captureArea: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#0d6ebd',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  captureButtonDisabled: {
    opacity: 0.4,
  },
});

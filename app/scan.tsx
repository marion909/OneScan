import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Corners } from '../types/Corners';
import { detectCorners } from '../modules/document-detector';
import CornerOverlay from '../components/CornerOverlay';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CAMERA_H = SCREEN_H * 0.72;
const DETECTION_INTERVAL_MS = 600;

export default function ScanScreen() {
  const router = useRouter();
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [corners, setCorners] = useState<Corners | null>(null);
  const [capturing, setCapturing] = useState(false);
  const detectionTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Echtzeit-Eckendetection alle DETECTION_INTERVAL_MS ms
  const runDetection = useCallback(async () => {
    if (capturing || !cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.3,
        base64: true,
        skipProcessing: true,
      });
      if (photo?.base64) {
        const detected = await detectCorners(photo.base64);
        setCorners(detected);
      }
    } catch {
      // Stilles Fehlschlagen — nächster Versuch im nächsten Intervall
    }
  }, [capturing]);

  useEffect(() => {
    if (permission?.granted) {
      detectionTimer.current = setInterval(runDetection, DETECTION_INTERVAL_MS);
    }
    return () => {
      if (detectionTimer.current) clearInterval(detectionTimer.current);
    };
  }, [permission?.granted, runDetection]);

  const handleCapture = async () => {
    if (capturing || !cameraRef.current) return;
    setCapturing(true);
    if (detectionTimer.current) clearInterval(detectionTimer.current);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: true,
        skipProcessing: false,
      });
      if (!photo?.base64) throw new Error('Foto konnte nicht aufgenommen werden');

      // Finale Ecken ermitteln
      let finalCorners = corners;
      try {
        finalCorners = await detectCorners(photo.base64);
      } catch {
        // Fallback auf letzte bekannte Ecken
      }

      router.push({
        pathname: '/confirm',
        params: {
          patientId: patientId ?? '',
          jpegBase64: photo.base64,
          cornersJson: finalCorners ? JSON.stringify(finalCorners) : '',
        },
      });
    } catch (e) {
      Alert.alert('Fehler', e instanceof Error ? e.message : 'Unbekannter Fehler');
      setCapturing(false);
      if (detectionTimer.current) clearInterval(detectionTimer.current);
      detectionTimer.current = setInterval(runDetection, DETECTION_INTERVAL_MS);
    }
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#005EB8" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.helpText}>Kamerazugriff benötigt</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Zugriff erlauben</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasDocument = corners !== null &&
    Math.abs(corners.topLeft.x - corners.bottomRight.x) > 0.15;

  return (
    <View style={styles.container}>
      {/* Kamera + Overlay */}
      <View style={[styles.cameraContainer, { height: CAMERA_H }]}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
        />
        <CornerOverlay
          corners={corners}
          width={SCREEN_W}
          height={CAMERA_H}
        />
        {/* Status-Indikator */}
        <View style={[styles.badge, hasDocument ? styles.badgeGreen : styles.badgeGrey]}>
          <Text style={styles.badgeText}>
            {hasDocument ? '✓ Dokument erkannt' : 'Dokument ausrichten...'}
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.patientLabel}>Patient: <Text style={styles.patientId}>{patientId}</Text></Text>
        <TouchableOpacity
          style={[styles.captureBtn, capturing && styles.captureBtnDisabled]}
          onPress={handleCapture}
          disabled={capturing}
        >
          {capturing
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.captureBtnText}>Aufnehmen</Text>
          }
        </TouchableOpacity>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Zurück</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const BLUE = '#005EB8';

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#000' },
  center:             { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, backgroundColor: '#F5F7FA' },
  helpText:           { fontSize: 16, color: '#555' },
  cameraContainer:    { width: SCREEN_W, overflow: 'hidden' },
  badge: {
    position: 'absolute', bottom: 16, alignSelf: 'center',
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, opacity: 0.9,
  },
  badgeGreen:         { backgroundColor: '#00A050' },
  badgeGrey:          { backgroundColor: '#555' },
  badgeText:          { color: '#fff', fontSize: 13, fontWeight: '600' },
  footer: {
    flex: 1, backgroundColor: '#1A1A2E',
    paddingVertical: 20, paddingHorizontal: 24, gap: 12,
    justifyContent: 'center',
  },
  patientLabel:       { color: '#aaa', fontSize: 13, textAlign: 'center' },
  patientId:          { color: '#fff', fontWeight: '700' },
  captureBtn: {
    backgroundColor: BLUE,
    paddingVertical: 16, borderRadius: 12,
    alignItems: 'center',
  },
  captureBtnDisabled: { opacity: 0.5 },
  captureBtnText:     { color: '#fff', fontWeight: '700', fontSize: 17 },
  backBtn:            { alignItems: 'center', paddingVertical: 8 },
  backBtnText:        { color: '#888', fontSize: 14 },
  btn: {
    backgroundColor: BLUE, paddingVertical: 12, paddingHorizontal: 24,
    borderRadius: 10,
  },
  btnText:            { color: '#fff', fontWeight: '700', fontSize: 15 },
});

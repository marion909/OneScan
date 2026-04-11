import { requireNativeModule } from 'expo-modules-core';
import type { Corners } from '../../types/Corners';

interface DocumentDetectorNative {
  detectCorners(base64Jpeg: string): Promise<Corners>;
}

const DocumentDetector = requireNativeModule<DocumentDetectorNative>('DocumentDetector');

/**
 * Erkennt Dokumentecken in einem JPEG-Bild.
 * @param base64Jpeg  Base64-kodiertes JPEG (ohne data:image/jpeg;base64 Prefix)
 * @returns Normalisierte Eckkoordinaten [0.0 – 1.0] (top-left Ursprung)
 *          Gibt null-Ecken zurück wenn kein Dokument erkannt wurde.
 */
export async function detectCorners(base64Jpeg: string): Promise<Corners> {
  return await DocumentDetector.detectCorners(base64Jpeg);
}

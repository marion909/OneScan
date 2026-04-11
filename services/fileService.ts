import { File, Paths } from 'expo-file-system';

/**
 * Speichert Base64-JPEG-Daten in den temporären App-Cache (expo-file-system v19+ API).
 * @returns URI der gespeicherten Datei
 */
export async function saveTempJpeg(base64Data: string, fileName: string): Promise<string> {
  const file = new File(Paths.cache, fileName);
  // Schreibe base64 als binary
  file.write(base64Data, { encoding: 'base64' });
  return file.uri;
}

/**
 * Liest eine Datei als Base64-String.
 */
export async function readFileBase64(uri: string): Promise<string> {
  const file = new File(uri);
  return await file.base64();
}

/**
 * Löscht eine temporäre Datei (kein Fehler, wenn nicht vorhanden).
 */
export async function deleteTempFile(uri: string): Promise<void> {
  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Ignorieren — temporäre Datei konnte nicht gelöscht werden
  }
}


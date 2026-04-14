import * as FileSystem from 'expo-file-system';

/**
 * Reads a file from the given URI and returns its content as a base64 string.
 */
export async function readFileAsBase64(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

/**
 * Writes base64-encoded data to a temporary file in the cache directory.
 * Returns the file URI.
 */
export async function writeTempFile(filename: string, base64Data: string): Promise<string> {
  const uri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, base64Data, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return uri;
}

/**
 * Deletes a file if it exists.
 */
export async function deleteFile(uri: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(uri);
  if (info.exists) {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
}
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


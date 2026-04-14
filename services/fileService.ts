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

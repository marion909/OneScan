import { requireNativeModule } from 'expo-modules-core';

interface SmbWriterModule {
  testConnection(uncPath: string, username: string, password: string, domain: string): Promise<boolean>;
  writeFiles(
    uncPath: string,
    username: string,
    password: string,
    domain: string,
    jpegBase64: string,
    gdtBase64: string,
    jpegFileName: string,
    gdtFileName: string
  ): Promise<void>;
}

function getModule(): SmbWriterModule {
  return requireNativeModule('SmbWriter');
}

export function testConnection(uncPath: string, username: string, password: string, domain: string): Promise<boolean> {
  return getModule().testConnection(uncPath, username, password, domain);
}

export function writeFiles(
  uncPath: string,
  username: string,
  password: string,
  domain: string,
  jpegBase64: string,
  gdtBase64: string,
  jpegFileName: string,
  gdtFileName: string
): Promise<void> {
  return getModule().writeFiles(uncPath, username, password, domain, jpegBase64, gdtBase64, jpegFileName, gdtFileName);
}
import { requireNativeModule } from 'expo-modules-core';
import type { UNCSettings } from '../../types/Settings';

interface SmbWriterNative {
  testConnection(
    uncPath: string,
    username: string,
    password: string,
    domain: string
  ): Promise<boolean>;
  writeFiles(
    uncPath: string,
    username: string,
    password: string,
    domain: string,
    jpegBase64: string,
    gdtBase64: string,
    jpegFileName: string,
    gdtFileName: string
  ): Promise<void>;
}

function getModule(): SmbWriterNative {
  return requireNativeModule<SmbWriterNative>('SmbWriter');
}

export async function testConnection(settings: UNCSettings): Promise<boolean> {
  return await getModule().testConnection(
    settings.uncPath,
    settings.username,
    settings.password,
    settings.domain
  );
}

export async function writeFiles(
  settings: UNCSettings,
  jpegBase64: string,
  gdtBytes: Uint8Array,
  jpegFileName: string,
  gdtFileName: string
): Promise<void> {
  // GDT Bytes → Base64 für nativen Transport
  const gdtBase64 = uint8ArrayToBase64(gdtBytes);
  await getModule().writeFiles(
    settings.uncPath,
    settings.username,
    settings.password,
    settings.domain,
    jpegBase64,
    gdtBase64,
    jpegFileName,
    gdtFileName
  );
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

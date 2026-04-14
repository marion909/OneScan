import { requireNativeModule } from 'expo-modules-core';

interface SmbWriterModule {
  testConnection(uncPath: string, username: string, password: string, domain: string): Promise<boolean>;
  readFile(uncPath: string, username: string, password: string, domain: string, fileName: string): Promise<string>;
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

export function readFile(uncPath: string, username: string, password: string, domain: string, fileName: string): Promise<string> {
  return getModule().readFile(uncPath, username, password, domain, fileName);
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

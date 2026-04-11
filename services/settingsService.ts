import * as SecureStore from 'expo-secure-store';
import type { UNCSettings } from '../types/Settings';
import { EMPTY_SETTINGS } from '../types/Settings';

const SETTINGS_KEY = 'onescan_settings_v1';

export async function saveSettings(settings: UNCSettings): Promise<void> {
  await SecureStore.setItemAsync(SETTINGS_KEY, JSON.stringify(settings));
}

export async function loadSettings(): Promise<UNCSettings | null> {
  const raw = await SecureStore.getItemAsync(SETTINGS_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as UNCSettings;
    if (!parsed.uncPath) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function isConfigured(): Promise<boolean> {
  const settings = await loadSettings();
  return settings !== null && settings.uncPath.length > 0;
}

export async function clearSettings(): Promise<void> {
  await SecureStore.deleteItemAsync(SETTINGS_KEY);
}

export { EMPTY_SETTINGS };

import * as SecureStore from 'expo-secure-store';
import { Settings } from '../types/Settings';

const SETTINGS_KEY = 'smb_settings';

export async function loadSettings(): Promise<Settings | null> {
  const json = await SecureStore.getItemAsync(SETTINGS_KEY);
  if (!json) return null;
  return JSON.parse(json) as Settings;
}

export async function saveSettings(settings: Settings): Promise<void> {
  await SecureStore.setItemAsync(SETTINGS_KEY, JSON.stringify(settings));
}

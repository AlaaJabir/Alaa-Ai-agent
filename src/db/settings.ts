import { getDB } from './database';
import { AppSettings, DEFAULT_SETTINGS } from '../types/settings';

const SETTINGS_KEY = 'app_user_settings';

export async function getSettings(): Promise<AppSettings> {
  try {
    const db = await getDB();
    const stored = await db.get('settings', SETTINGS_KEY);
    return { ...DEFAULT_SETTINGS, ...(stored || {}) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const updated = { ...current, ...settings };
  const db = await getDB();
  await db.put('settings', updated, SETTINGS_KEY);
  return updated;
}

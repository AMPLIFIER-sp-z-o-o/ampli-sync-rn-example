import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Session } from '../../auth/types';
import { logoutCleanup } from '../sync/service';

const SESSION_KEY = 'session';

const normalizeSession = (value: unknown): Session | null => {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;

  const login = record.login;
  const accessToken = record.accessToken;
  const syncUrl = record.syncUrl;

  if (typeof login !== 'string' || login.length === 0) return null;
  if (typeof accessToken !== 'string' || accessToken.length === 0) return null;
  if (typeof syncUrl !== 'string' || syncUrl.length === 0) return null;

  return { login, accessToken, syncUrl };
};

export const clearSession = async (): Promise<void> => {
  await AsyncStorage.removeItem(SESSION_KEY);
};

export const loadSession = async (): Promise<Session | null> => {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    await logoutCleanup();
    await clearSession();
    return null;
  }

  const session = normalizeSession(parsed);
  if (!session) {
    await logoutCleanup();
    await clearSession();
    return null;
  }

  return session;
};

export const saveSession = async (session: Session): Promise<void> => {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

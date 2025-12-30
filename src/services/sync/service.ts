import type { Session } from '../../auth/types';
import {
  deleteLocalDatabaseFiles,
  migrationsAPI,
  prepopulateDbIfMissing,
} from './api';
import {
  receiveChangesQuery,
  sendChangesQuery,
  updateDatabaseQuery,
} from './sql';
import { getUniqueId } from 'react-native-device-info';
import { closeDatabase, connectDatabase, getDb } from '../db/connection';

const DATABASE_NAME = 'main';

export const initializeForSession = async (session: Session): Promise<void> => {
  await closeDatabase();

  const deviceUniqueId = await getUniqueId();

  await prepopulateDbIfMissing({
    syncUrl: session.syncUrl,
    accessToken: session.accessToken,
    deviceUniqueId,
    databaseName: DATABASE_NAME,
  });

  await connectDatabase(DATABASE_NAME);
};

const isDbConnected = (): boolean => {
  try {
    getDb();
    return true;
  } catch {
    return false;
  }
};

const ensureDb = async (session: Session): Promise<void> => {
  if (isDbConnected()) return;
  await initializeForSession(session);
};

export const syncPull = async (
  session: Session,
  onProgress?: (progress: number) => void,
): Promise<void> => {
  await ensureDb(session);

  const deviceUniqueId = await getUniqueId();
  const migrations = await migrationsAPI({
    syncUrl: session.syncUrl,
    accessToken: session.accessToken,
    deviceUniqueId,
    login: session.login,
  });

  if (migrations.length > 0) {
    await updateDatabaseQuery({
      syncUrl: session.syncUrl,
      accessToken: session.accessToken,
      data: migrations,
    });
  }

  const anyError = await receiveChangesQuery(
    {
      syncUrl: session.syncUrl,
      accessToken: session.accessToken,
      deviceUniqueId,
    },
    progress => onProgress?.(progress),
  );

  if (anyError) {
    throw anyError;
  }
};

export const syncSend = async (session: Session): Promise<void> => {
  await ensureDb(session);
  const deviceUniqueId = await getUniqueId();
  await sendChangesQuery({
    syncUrl: session.syncUrl,
    accessToken: session.accessToken,
    deviceUniqueId,
  });
};

export const logoutCleanup = async (): Promise<void> => {
  await closeDatabase();
  await deleteLocalDatabaseFiles(DATABASE_NAME);
};

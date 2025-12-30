import {
  LibraryDirectoryPath,
  downloadFile,
  exists,
  mkdir,
  moveFile,
  unlink,
} from 'react-native-fs';
import { Platform } from 'react-native';
import { TextDecoder as TextDecoderRN } from 'text-encoding';
import { getBundleId } from 'react-native-device-info';
import pako from 'pako';
import { unzip } from 'react-native-zip-archive';

import { type JsonRecords } from './formats/json';
import type { PushJsonRequest } from './formats/pushTypes';

const AMPLI_SYNC_BASE_PATH = 'app/ampli-sync';

const toBaseUrl = (url: string): string =>
  url.endsWith('/') ? url : `${url}/`;
const joinUrl = (base: string, path: string): string =>
  `${toBaseUrl(base)}${path.replace(/^\//, '')}`;

const ampliSyncUrl = (syncUrl: string, path: string): string =>
  joinUrl(syncUrl, `${AMPLI_SYNC_BASE_PATH}/${path.replace(/^\//, '')}`);

const authHeader = (accessToken: string): { Authorization: string } => ({
  Authorization: `Bearer ${accessToken}`,
});

const assertOk = (response: Response, label: string): void => {
  if (response.ok) return;
  throw new Error(`${label} failed: ${response.status}`);
};

const getPlatformDatabasePath = (): string => {
  const bundleId = getBundleId();
  const androidBundleId = bundleId === 'unknown' ? 'unknown.bundle' : bundleId;
  return Platform.OS === 'android'
    ? `/data/user/0/${androidBundleId}/databases`
    : `${LibraryDirectoryPath}/LocalDatabase`;
};

export type MigrationRow = {
  id: string | number;
  query: string;
};

export type PullChangesRow = {
  SyncId: number;
  Records: JsonRecords | null;
  TriggerInsertDrop: string;
  TriggerUpdateDrop: string;
  TriggerDeleteDrop: string;
  QueryInsert: string;
  QueryUpdate: string;
  QueryDelete: string;
  TriggerInsert: string;
  TriggerUpdate: string;
  TriggerDelete: string;
  MaxPackageSize: string | number;
};

export type PullChangesResponse = PullChangesRow[];

export const prepopulateDbIfMissing = async (params: {
  syncUrl: string;
  accessToken: string;
  deviceUniqueId: string;
  databaseName: string;
}): Promise<void> => {
  const { syncUrl, accessToken, deviceUniqueId, databaseName } = params;

  const platformDatabasePath = getPlatformDatabasePath();

  const sourcePath = `${platformDatabasePath}/database.zip`;
  const databasePath = `${platformDatabasePath}/${databaseName}.db`;

  const fromUrl = ampliSyncUrl(syncUrl, `prepopulate-db/${deviceUniqueId}`);

  const extractedDbName = 'amperflow.db';

  const headers = authHeader(accessToken);

  if (!(await exists(platformDatabasePath))) {
    await mkdir(platformDatabasePath);
  }

  if (await exists(databasePath)) {
    return;
  }

  try {
    if (await exists(sourcePath)) {
      await unlink(sourcePath);
    }
  } catch {
    // ignore
  }

  const options = {
    fromUrl,
    headers,
    toFile: sourcePath,
    readTimeout: 1000 * 60 * 15, // 15min
    connectionTimeout: 1000 * 60 * 15,
  };

  const { statusCode } = await downloadFile(options).promise;
  if (statusCode !== 200) {
    throw new Error(`Download database failed: ${statusCode}`);
  }

  await unzip(sourcePath, platformDatabasePath);
  await moveFile(`${platformDatabasePath}/${extractedDbName}`, databasePath);
  await unlink(sourcePath);
};

export const pushChangesAPI = async (params: {
  syncUrl: string;
  accessToken: string;
  data: PushJsonRequest;
}): Promise<void> => {
  const { syncUrl, accessToken, data } = params;
  const url = ampliSyncUrl(syncUrl, 'receive-changes');

  const response = await fetch(url, {
    method: 'POST',
    headers: { ...authHeader(accessToken), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  assertOk(response, 'pushChangesAPI');
};

export const migrationsAPI = async (params: {
  syncUrl: string;
  accessToken: string;
  login: string;
  deviceUniqueId: string;
}): Promise<MigrationRow[]> => {
  const { syncUrl, accessToken, login, deviceUniqueId } = params;
  const url = ampliSyncUrl(syncUrl, `migrations/${login}/${deviceUniqueId}`);

  const response = await fetch(url, { headers: authHeader(accessToken) });

  assertOk(response, 'migrationsAPI');

  const data = (await response.json()) as MigrationRow[];
  return data;
};

export const migrationResultAPI = async (params: {
  syncUrl: string;
  id: string | number;
  accessToken: string;
  executionTime: number;
  result: string;
}) => {
  const { syncUrl, accessToken } = params;
  const url = ampliSyncUrl(syncUrl, 'migrations-result');
  const body = {
    id: params.id,
    execution_time: params.executionTime,
    result: params.result,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { ...authHeader(accessToken), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  assertOk(response, 'migrationResultAPI');
};

export const pullChangesForTableAPI = async (params: {
  syncUrl: string;
  accessToken: string;
  tableName: string;
  deviceUniqueId: string;
}): Promise<PullChangesResponse> => {
  const { syncUrl, accessToken, tableName, deviceUniqueId } = params;
  const url = ampliSyncUrl(
    syncUrl,
    `sync-compressed/${tableName}/${deviceUniqueId}`,
  );

  const response = await fetch(url, { headers: authHeader(accessToken) });

  assertOk(response, 'pullChangesForTableAPI');

  const buffer = await response.arrayBuffer();
  const compressed = new Uint8Array(buffer);
  const inflate = pako.inflate(compressed);

  const Decoder: any =
    typeof (globalThis as any).TextDecoder !== 'undefined'
      ? (globalThis as any).TextDecoder
      : TextDecoderRN;

  const parsed = JSON.parse(
    new Decoder().decode(inflate),
  ) as PullChangesResponse;

  return parsed;
};

export const commitSyncAPI = async (params: {
  syncUrl: string;
  syncId: string | number;
  accessToken: string;
}) => {
  const { syncUrl, accessToken, syncId } = params;
  const url = ampliSyncUrl(syncUrl, `commit-sync/${syncId}`);

  const response = await fetch(url, { headers: authHeader(accessToken) });

  assertOk(response, 'commitSyncAPI');
};

export const deleteLocalDatabaseFiles = async (
  databaseName: string,
): Promise<void> => {
  const platformDatabasePath = getPlatformDatabasePath();

  const basePath = `${platformDatabasePath}/${databaseName}.db`;
  const paths = [
    basePath,
    `${basePath}-shm`,
    `${basePath}-wal`,
    `${basePath}-journal`,
  ];

  for (const path of paths) {
    try {
      await unlink(path);
    } catch {
      // ignore
    }
  }
};

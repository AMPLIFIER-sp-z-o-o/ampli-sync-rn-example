import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

let db: any = null;

export const getDb = (): any => {
  if (!db) throw new Error('Database not connected');
  return db;
};

export const connectDatabase = async (databaseName: string): Promise<void> => {
  if (db) return;

  db = await SQLite.openDatabase({
    name: `${databaseName}.db`,
    location: 'default',
  });
};

export const closeDatabase = async (): Promise<void> => {
  if (!db) return;
  try {
    await db.close();
  } catch {
    // ignore
  } finally {
    db = null;
  }
};

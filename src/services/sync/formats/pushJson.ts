import type { QueryLike } from '../../db/database';
import type { PushJsonRequest } from './pushTypes';

type DbAll = (query: QueryLike) => Promise<any[]>;

const getValueCaseInsensitive = (source: any, key: string): unknown => {
  if (!source || typeof source !== 'object') return undefined;
  if (Object.prototype.hasOwnProperty.call(source, key)) return source[key];

  const lower = key.toLowerCase();
  for (const sourceKey of Object.keys(source)) {
    if (sourceKey.toLowerCase() === lower) return source[sourceKey];
  }

  return undefined;
};

const toValue = (value: unknown): unknown => {
  if (value === null || typeof value === 'undefined') return 'null';
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  return String(value);
};

const opColumnNames = (sqlText: string): string[] => {
  const columnParts = sqlText.replace(/^[^(]+\(([^)]+)\)/, '$1').split(',');
  return columnParts
    .map(col =>
      col
        .trim()
        .split(' ')[0]
        .replace('[', '')
        .replace(']', '')
        .replace(/"/g, ''),
    )
    .filter(Boolean);
};

const toRow = (source: any, columns: string[]): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  for (const columnName of columns) {
    const lower = columnName.toLowerCase();
    if (lower === 'mergeupdate') continue;
    const outputKey = lower === 'rowid' ? 'rowid' : columnName;
    row[outputKey] = toValue(getValueCaseInsensitive(source, columnName));
  }
  return row;
};

export const buildPushJsonRequestFromDb = async (
  dbAll: DbAll,
): Promise<{
  request: PushJsonRequest;
  recordsUpdated: QueryLike[];
  recordsDeleted: QueryLike[];
}> => {
  const recordsUpdated: QueryLike[] = [];
  const recordsDeleted: QueryLike[] = [];

  const tablesArray = await dbAll(
    "select tbl_name, sql from sqlite_master where type='table' and sql like '%RowId%'",
  );
  const tables = tablesArray
    .filter(({ tbl_name }) => tbl_name && tbl_name !== 'MergeDelete')
    .map(({ tbl_name, sql }) => ({ tableName: tbl_name, sql }));

  const changes: PushJsonRequest['changes'] = [];

  for (const { tableName, sql } of tables) {
    const columns = sql ? opColumnNames(sql) : [];
    if (columns.length === 0) continue;

    const insertsSource = await dbAll(
      `select * from ${tableName} where RowId is null`,
    );
    const updatesSource = await dbAll(
      `select * from ${tableName} where MergeUpdate > 0 and RowId is not null`,
    );

    const inserts = insertsSource.map((row: any) => toRow(row, columns));
    const updates = updatesSource.map((row: any) => {
      const rowIdValue = getValueCaseInsensitive(row, 'rowid');
      const mergeUpdateValue = getValueCaseInsensitive(row, 'MergeUpdate');
      recordsUpdated.push({
        sql: `UPDATE ${tableName} SET MergeUpdate=0 WHERE rowid=? AND MergeUpdate=?`,
        args: [String(rowIdValue), mergeUpdateValue],
      });
      return toRow(row, columns);
    });

    if (inserts.length || updates.length) {
      changes.push({ table: tableName, inserts, updates });
    }
  }

  const deletesSource = await dbAll('select * from MergeDelete');
  const deletes: PushJsonRequest['deletes'] = deletesSource.map((row: any) => {
    const tableIdValue = getValueCaseInsensitive(row, 'TableId');
    const rowIdValue = getValueCaseInsensitive(row, 'RowId');
    recordsDeleted.push({
      sql: 'DELETE FROM MergeDelete WHERE TableId=? AND RowId=?',
      args: [tableIdValue, rowIdValue],
    });
    return { table: String(tableIdValue), rowid: String(rowIdValue) };
  });

  return { request: { changes, deletes }, recordsUpdated, recordsDeleted };
};

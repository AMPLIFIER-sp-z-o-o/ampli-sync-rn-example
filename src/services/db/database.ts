import { getDb } from './connection';

type Query = {
  sql: string;
  args?: unknown[];
};

export type QueryLike = string | Query;

export const dbAll = async <T = any>(query: QueryLike): Promise<T[]> => {
  const sql = typeof query === 'string' ? query : query.sql;
  const args = typeof query === 'string' ? [] : (query.args ?? []);
  const [result] = await getDb().executeSql(sql, args);
  const rows: T[] = [];

  const length = result?.rows?.length || 0;
  const item = result?.rows?.item?.bind(result?.rows);
  for (let i = 0; i < length; i++) {
    rows.push(item(i) as T);
  }

  return rows;
};

export const dbExec = async (query: QueryLike): Promise<void> => {
  const sql = typeof query === 'string' ? query : query.sql;
  const args = typeof query === 'string' ? [] : (query.args ?? []);
  await getDb().executeSql(sql, args);
};

export const dbBatch = async (queries: QueryLike[]): Promise<void> => {
  const statements = queries.map(query => {
    if (typeof query === 'string') return query;
    const args = query.args ?? [];
    return args.length ? [query.sql, args] : query.sql;
  });

  await getDb().sqlBatch(statements);
};

export type PushJsonRow = Record<string, unknown>;

export type PushJsonRequest = {
  changes: Array<{
    table: string;
    inserts: PushJsonRow[];
    updates: PushJsonRow[];
  }>;
  deletes: Array<{
    table: string;
    rowid: string;
  }>;
};

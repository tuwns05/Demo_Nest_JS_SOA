export interface SqlQueryResult<Row> {
  recordset: Row[];
  rowsAffected: number[];
}

export declare class DatabaseService {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    statement: string,
    parameters?: Record<string, unknown>,
  ): Promise<SqlQueryResult<Row>>;
}

export declare class DatabaseModule {}

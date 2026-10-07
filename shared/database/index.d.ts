export interface SqlQueryResult<Row> {
  recordset: Row[];
  rowsAffected: number[];
}

export declare class DatabaseService {
  onModuleInit(): Promise<void>;
  onModuleDestroy(): Promise<void>;
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    statement: string,
    parameters?: Record<string, unknown>,
  ): Promise<SqlQueryResult<Row>>;
}

export declare class DatabaseModule {
  static register(): {
    module: typeof DatabaseModule;
    global: boolean;
    providers: Array<{ provide: typeof DatabaseService; useFactory: () => DatabaseService }>;
    exports: Array<typeof DatabaseService>;
  };
}

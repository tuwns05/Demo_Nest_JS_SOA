import { Injectable, Logger, Module } from '@nestjs/common';
import type { DynamicModule, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createRequire } from 'node:module';

export interface SqlQueryResult<Row> {
  recordset: Row[];
  rowsAffected: number[];
}

interface SqlRequest {
  input(name: string, value: unknown): SqlRequest;
  query<Row>(statement: string): Promise<SqlQueryResult<Row>>;
}
interface SqlPool {
  connected: boolean;
  connect(): Promise<unknown>;
  close(): Promise<void>;
  request(): SqlRequest;
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Thiếu biến môi trường ${name}. Hãy xem .env.example ở thư mục gốc.`);
  return value;
}

function odbc(value: string): string {
  return `{${value.replaceAll('}', '}}')}}`;
}

function connectionString(): string {
  const host = required('DB_HOST');
  const database = required('DB_NAME');
  if (process.env.DB_CONNECTION_STRING?.trim()) return process.env.DB_CONNECTION_STRING;
  const driver = required('DB_ODBC_DRIVER');
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  if (Boolean(user) !== Boolean(password)) {
    throw new Error('Cần cung cấp cả DB_USER và DB_PASSWORD, hoặc bỏ cả hai để dùng Windows Authentication. Xem .env.example.');
  }
  if (process.env.DB_PORT && process.env.DB_INSTANCE) {
    throw new Error('Chỉ chọn DB_PORT hoặc DB_INSTANCE. Xem .env.example.');
  }
  const server = process.env.DB_PORT ? `${host},${process.env.DB_PORT}` :
    `${host}${process.env.DB_INSTANCE ? `\\${process.env.DB_INSTANCE}` : ''}`;
  return [
    `Driver=${odbc(driver)}`, `Server=${odbc(server)}`, `Database=${odbc(database)}`,
    user && password ? `UID=${odbc(user)};PWD=${odbc(password)};Trusted_Connection=No` : 'Trusted_Connection=Yes',
    'Encrypt=yes', 'TrustServerCertificate=yes',
  ].join(';') + ';';
}

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool?: SqlPool;
  private readonly logger = new Logger(DatabaseService.name);

  async onModuleInit(): Promise<void> {
    // Kiểm tra cấu hình trước khi nạp driver native hoặc mở kết nối.
    const connection = connectionString();
    try {
      const require = createRequire(import.meta.url);
      const sql = require('mssql/msnodesqlv8') as { ConnectionPool: new (config: unknown) => SqlPool };
      this.pool = new sql.ConnectionPool({
        connectionString: connection, connectionTimeout: 30000, requestTimeout: 30000,
        pool: { max: 10, min: 0 },
      });
      await this.pool.connect();
      this.logger.log('Đã kết nối SQL Server');
    } catch {
      await this.pool?.close().catch(() => undefined);
      this.logger.error('Không kết nối được SQL Server. Kiểm tra DB_HOST, DB_NAME, DB_PORT/DB_INSTANCE, TCP/IP, firewall, ODBC driver và quyền Windows hoặc DB_USER/DB_PASSWORD. Xem .env.example.');
      // Không đưa lỗi driver vào log vì có thể chứa chuỗi kết nối hoặc mật khẩu.
      throw new Error('Kết nối SQL Server thất bại; kiểm tra cấu hình và driver theo .env.example.');
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool?.close();
  }

  async query<Row extends Record<string, unknown> = Record<string, unknown>>(
    statement: string, parameters: Record<string, unknown> = {},
  ): Promise<SqlQueryResult<Row>> {
    if (!this.pool?.connected) throw new Error('Kết nối SQL Server chưa sẵn sàng');
    const request = this.pool.request();
    for (const [name, value] of Object.entries(parameters)) request.input(name, value);
    return request.query<Row>(statement);
  }
}

@Module({})
export class DatabaseModule {
  static register(): DynamicModule {
    return { module: DatabaseModule, global: true, providers: [DatabaseService], exports: [DatabaseService] };
  }
}

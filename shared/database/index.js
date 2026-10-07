import { Global, Injectable, Logger, Module } from '@nestjs/common';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sql = require('mssql/msnodesqlv8');

function getDriver() {
  return process.env.DB_ODBC_DRIVER ?? 'ODBC Driver 17 for SQL Server';
}

function createConnectionString() {
  if (process.env.DB_CONNECTION_STRING) {
    return process.env.DB_CONNECTION_STRING;
  }

  const host = process.env.DB_HOST ?? 'localhost';
  const database = process.env.DB_NAME ?? 'SOA_DATN';
  const driver = getDriver();

  const useSqlAuth = Boolean(process.env.DB_USER && process.env.DB_PASSWORD);

  if (useSqlAuth) {
    return [
      `Driver={${driver}}`,
      `Server=${host}${process.env.DB_PORT ? `,${process.env.DB_PORT}` : ''}`,
      `Database=${database}`,
      `UID=${process.env.DB_USER}`,
      `PWD=${process.env.DB_PASSWORD}`,
      'Encrypt=yes',
      'TrustServerCertificate=yes',
      'Trusted_Connection=No',
    ].join(';') + ';';
  }

  const instance = process.env.DB_INSTANCE ? `\\${process.env.DB_INSTANCE}` : '';
  return [
    `Driver={${driver}}`,
    `Server=${host}${instance}`,
    `Database=${database}`,
    'Trusted_Connection=Yes',
    'Encrypt=yes',
    'TrustServerCertificate=yes',
  ].join(';') + ';';
}

export class DatabaseService {
  pool;
  logger = new Logger(DatabaseService.name);

  async onModuleInit() {
    try {
      this.pool = new sql.ConnectionPool({
        connectionString: createConnectionString(),
        connectionTimeout: 30000,
        requestTimeout: 30000,
        pool: { max: 10, min: 0 },
      });

      await this.pool.connect();
      const currentDatabase = process.env.DB_NAME ?? 'SOA_DATN';
      this.logger.log(`Connected to SQL Server database ${currentDatabase}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        'Không thể kết nối SQL Server. Kiểm tra DB_NAME, DB_HOST, DB_INSTANCE, DB_USER/DB_PASSWORD, ODBC Driver 17 và quyền truy cập Windows Authentication.',
        message,
      );
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.close();
    }
  }

  async query(statement, parameters = {}) {
    if (!this.pool?.connected) {
      throw new Error('SQL Server connection is not available');
    }

    const request = this.pool.request();
    for (const [name, value] of Object.entries(parameters)) {
      request.input(name, value);
    }

    return request.query(statement);
  }
}

Injectable()(DatabaseService);

export class DatabaseModule {
  static register() {
    return {
      module: DatabaseModule,
      global: true,
      providers: [
        {
          provide: DatabaseService,
          useFactory: () => new DatabaseService(),
        },
      ],
      exports: [DatabaseService],
    };
  }
}

Global()(DatabaseModule);
Module({
  global: true,
  providers: [DatabaseService],
  exports: [DatabaseService],
})(DatabaseModule);

import { Global, Injectable, Logger, Module } from '@nestjs/common';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sql = require('mssql/msnodesqlv8');

function createConnectionString() {
  if (process.env.DB_CONNECTION_STRING) {
    return process.env.DB_CONNECTION_STRING;
  }

  const host = process.env.DB_HOST ?? 'LAPTOP-TUNWS';
  const database = process.env.DB_NAME ?? 'SOA_BTH';
  const instance = process.env.DB_INSTANCE ?? 'VIETTUAN';
  const driver = process.env.DB_ODBC_DRIVER ?? 'ODBC Driver 17 for SQL Server';

  return `Driver={${driver}};Server=${host}\\${instance};Database=${database};Trusted_Connection=Yes;Encrypt=Yes;TrustServerCertificate=Yes;`;
}

export class DatabaseService {
  pool;
  logger = new Logger(DatabaseService.name);

  async onModuleInit() {
    this.pool = new sql.ConnectionPool({
      connectionString: createConnectionString(),
      connectionTimeout: 30000,
      requestTimeout: 30000,
      pool: { max: 10, min: 0 },
    });

    await this.pool.connect();
    this.logger.log(
      `Connected to SQL Server database ${process.env.DB_NAME ?? 'SOA_BTH'}`,
    );
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

export class DatabaseModule {}

Global()(DatabaseModule);
Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})(DatabaseModule);

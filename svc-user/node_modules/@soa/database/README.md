# Shared SQL Server connection

`@soa/database` provides one shared connection module for the services in this
repository. Import `DatabaseModule` in each service's root Nest module and inject
`DatabaseService` where database queries are needed. Each service process owns
its own SQL connection pool.

The default connection targets `LAPTOP-TUNWS\VIETTUAN`, database `SOA_BTH`,
uses Windows Authentication, and enables encryption. It uses the ODBC Driver 17
for SQL Server. Override these settings with `DB_HOST`, `DB_INSTANCE`,
`DB_NAME`, and `DB_ODBC_DRIVER`, or supply a full `DB_CONNECTION_STRING`.

The Windows account running each service must have access to the database, and
ODBC Driver 17 must be installed on that machine.

```ts
import { Module } from '@nestjs/common';
import { DatabaseModule } from '@soa/database';

@Module({ imports: [DatabaseModule] })
export class AppModule {}
```

For another service, add `"@soa/database": "file:../shared/database"` and
`mssql` plus `msnodesqlv8` to its dependencies, then import the module as above.

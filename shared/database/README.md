# Shared database

Package k?t n?i chung cho toàn b? h? th?ng SOA. M?i database name, server và login d?u d?c t? bi?n môi tru?ng; không hard-code vào file `index.js`.

## Bi?n b?t bu?c

- `DB_NAME` (m?c d?nh `SOA_DATN` n?u không du?c cung c?p)
- `DB_HOST`
- `DB_ODBC_DRIVER` (m?c d?nh `ODBC Driver 17 for SQL Server`)

## SQL Authentication

- `DB_USER`
- `DB_PASSWORD`

## Windows Authentication

- `DB_INSTANCE` (tu? ch?n)
- `DB_CONNECTION_STRING` (tu? ch?n, override hoàn toàn)

## API

- `DatabaseService.query(sql, params)`

M?i truy v?n ph?i dùng tham s? có tên v?i `@param`, không n?i chu?i.

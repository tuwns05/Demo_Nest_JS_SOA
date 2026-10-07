# Package kết nối SQL Server

`@soa/database` được dùng qua `file:../shared/database`. API: `DatabaseModule.register()` và `DatabaseService.query(sql, params)`. Package chỉ chứa hạ tầng, không có nghiệp vụ.

| Biến | Ý nghĩa |
| --- | --- |
| DB_HOST, DB_NAME | Bắt buộc, không có giá trị mặc định |
| DB_PORT | Cổng TCP, không dùng đồng thời DB_INSTANCE |
| DB_INSTANCE | Instance SQL Server tùy chọn |
| DB_ODBC_DRIVER | Tên driver đã cài, ví dụ ODBC Driver 17 for SQL Server |
| DB_USER, DB_PASSWORD | Cả hai để dùng SQL Authentication; bỏ cả hai dùng Windows |
| DB_CONNECTION_STRING | Chuỗi ODBC tùy chọn; vẫn cần DB_HOST/DB_NAME |

Xem `.env.example` gốc. Windows Authentication dùng danh tính tiến trình Node. Cần SQL Server và ODBC driver phù hợp kiến trúc. Pool được tái sử dụng và đóng khi shutdown. Không log mật khẩu hay chuỗi kết nối. Demo dùng Encrypt và TrustServerCertificate; production cần chính sách chứng chỉ riêng.

```typescript
const result = await database.query('SELECT [IdUser] FROM [dbo].[User] WHERE [UserName] = @name', { name: 'demo' });
```

Không nối đầu vào người dùng vào SQL. Khi lỗi kết nối, kiểm tra host, DB, cổng/instance, firewall, driver và quyền tài khoản. Khi thiếu biến, thông báo phải chỉ rõ tên biến và nhắc `.env.example`.

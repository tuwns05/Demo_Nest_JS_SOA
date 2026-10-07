# Chuẩn bị dữ liệu đăng nhập

Tạo database riêng bằng công cụ quản trị trước, đặt DB_NAME tương ứng trong .env gốc. SQL không tạo hoặc tự chuyển database; luôn chọn đúng database trước khi chạy. Tài khoản ứng dụng cần quyền SELECT trên dbo.User; tài khoản chạy schema cần quyền tạo bảng.

Trong SSMS: kết nối server, chọn database ở thanh công cụ, mở schema.sql và Execute; sau đó seed.sql và Execute. Có thể chạy lại hai script; seed không ghi đè user đã tồn tại. Nếu bảng User đã tồn tại với cấu trúc khác, cần kiểm tra và điều chỉnh thủ công; script không tự migrate.

Với Windows Authentication:

```powershell
sqlcmd -S "TEN_MAY\INSTANCE" -d "TEN_DATABASE" -E -b -f 65001 -i db/schema.sql
sqlcmd -S "TEN_MAY\INSTANCE" -d "TEN_DATABASE" -E -b -f 65001 -i db/seed.sql
```

Với SQL Authentication, thay -E bằng -U tài khoản SQL và nhập mật khẩu theo lời nhắc của sqlcmd. Không ghi mật khẩu thật vào script hoặc commit.

User minh họa: **demo**, mật khẩu gốc: **Demo@123456**. seed.sql chỉ lưu bcrypt hash (cost 12), không phải mật khẩu thật của người dùng. Không dùng tài khoản minh họa ở production. Xóa hoặc thay mật khẩu trước khi triển khai.

Thử POST /auth/login bằng docs/api-test.http; sai mật khẩu phải 401. Nếu ODBC hoặc SQL Server chưa có, kiểm thử giả lập chỉ chứng minh logic bcrypt/JWT, không xác minh kết nối và schema SQL thật.

# svc-auth

Xác thực: POST /auth/login công khai, GET /auth/health công khai trực tiếp, GET /auth/profile cần Bearer token. Đăng nhập dùng bcrypt và phát JWT.

Đăng nhập quản trị nhận body `{ "user": "tên tài khoản", "password": "mật khẩu" }`. Trường `user` đối chiếu `dbo.User.UserName`, mật khẩu kiểm tra với bcrypt hash trong `dbo.User.Password`. Không dùng mã sinh viên hoặc mật khẩu trong `SINHVIEN` để đăng nhập. JWT giữ `sub = IdUser`, `username = UserName`; không có liên kết MaSV. Bảng User giữ nguyên cấu trúc. Hiện chưa có phân quyền vai trò riêng.

## Biến môi trường

| Biến riêng | Ý nghĩa |
| --- | --- |
| PORT | Cổng riêng của tiến trình |

Cấu hình chung đọc từ ../.env: DB_HOST, DB_NAME bắt buộc cho service kết nối SQL; DB_PORT, DB_INSTANCE, DB_ODBC_DRIVER, DB_USER, DB_PASSWORD, DB_CONNECTION_STRING tùy cấu hình. Gateway và auth dùng JWT_SECRET chung; auth dùng JWT_EXPIRES_IN. Xem mẫu gốc và mẫu riêng, không commit .env.

## Chạy riêng

Từ thư mục gốc, sao chép .env.example thành .env và sửa cấu hình. Trong thư mục svc-auth chạy:

```powershell
Copy-Item .env.example .env
npm.cmd install
npm.cmd run build
npm.cmd run start:prod
```

Có thể dùng npm.cmd run start:dev để theo dõi thay đổi. Swagger trực tiếp tại /api ở các service, gateway không có Swagger tổng hợp. Xem ../docs/API.md để phân biệt API hiện có và hợp đồng dự kiến.

# svc-detai

Dịch vụ detai; hiện chỉ có GET /detai/health, kiểm tra SQL Server (200 hoặc 503). Chưa có CRUD.

## Biến môi trường

Service đăng ký AuthGuard toàn cục. API nghiệp vụ mới mặc định yêu cầu JWT HS256, kể cả gọi trực tiếp cổng service; chỉ endpoint có `@Public()` được miễn (hiện là health). Token phải có `sub`, `exp`, chữ ký hợp lệ và chưa hết hạn. Header `x-user-id` không thay thế token.

Dùng `JWT_SECRET` ít nhất 32 ký tự, giống svc-auth/gateway/svc-sinhvien, đọc từ `.env` gốc hoặc `.env` service. Gửi `Authorization: Bearer <access_token>` lấy từ `POST /auth/login`. Thiếu hoặc sai token trả 401. Swagger hỗ trợ nút Authorize; hiện chưa có phân quyền vai trò.

| Biến riêng | Ý nghĩa |
| --- | --- |
| PORT | Cổng riêng của tiến trình |

Cấu hình chung đọc từ ../.env: DB_HOST, DB_NAME bắt buộc cho service kết nối SQL; DB_PORT, DB_INSTANCE, DB_ODBC_DRIVER, DB_USER, DB_PASSWORD, DB_CONNECTION_STRING tùy cấu hình. Gateway và auth dùng JWT_SECRET chung; auth dùng JWT_EXPIRES_IN. Xem mẫu gốc và mẫu riêng, không commit .env.

## Chạy riêng

Từ thư mục gốc, sao chép .env.example thành .env và sửa cấu hình. Trong thư mục svc-detai chạy:

```powershell
Copy-Item .env.example .env
npm.cmd install
npm.cmd run build
npm.cmd run start:prod
```

Có thể dùng npm.cmd run start:dev để theo dõi thay đổi. Swagger trực tiếp tại /api ở các service, gateway không có Swagger tổng hợp. Xem ../docs/API.md để phân biệt API hiện có và hợp đồng dự kiến.

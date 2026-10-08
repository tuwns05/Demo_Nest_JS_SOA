# svc-sinhvien

Dịch vụ sinh viên có `GET /sinhvien/sinh-vien/health` và `POST /sinhvien/sinh-vien/create`.

## Xác thực

Service tự kiểm tra JWT HS256 cho các API nghiệp vụ, kể cả khi gọi trực tiếp cổng 3001. Guard được đăng ký toàn cục: API mới tự yêu cầu token trừ khi được đánh dấu `@Public()`. Endpoint health công khai để giám sát kết nối database (200 hoặc 503).

`JWT_SECRET` trong `.env` gốc phải có ít nhất 32 ký tự và giống khóa dùng bởi `svc-auth` và gateway. JWT phải có `sub`, `exp`, chữ ký hợp lệ và chưa hết hạn. Service xác minh tại chỗ, không gọi `svc-auth` cho mỗi request và không tin header `x-user-id` làm căn cứ xác thực.

Đăng nhập qua `POST http://localhost:3000/auth/login` để lấy `access_token`. Gọi API tạo sinh viên qua gateway hoặc trực tiếp với header `Authorization: Bearer <access_token>`. Trên Swagger `http://localhost:3001/api`, chọn **Authorize** và dán token (không thêm tiền tố Bearer). Thiếu token, token sai hoặc hết hạn trả 401. Hiện chưa có phân quyền theo vai trò.

Khi triển khai, chỉ công khai gateway; giới hạn cổng service trong mạng nội bộ. Health và giao diện Swagger vẫn công khai trên service.

## Biến môi trường

| Biến riêng | Ý nghĩa |
| --- | --- |
| PORT | Cổng riêng của tiến trình |

Cấu hình chung đọc từ ../.env: DB_HOST, DB_NAME bắt buộc cho service kết nối SQL; DB_PORT, DB_INSTANCE, DB_ODBC_DRIVER, DB_USER, DB_PASSWORD, DB_CONNECTION_STRING tùy cấu hình. Sinhvien, gateway và auth dùng JWT_SECRET chung; auth dùng JWT_EXPIRES_IN. Xem mẫu gốc và mẫu riêng, không commit .env.

## Chạy riêng

Từ thư mục gốc, sao chép .env.example thành .env và sửa cấu hình. Trong thư mục svc-sinhvien chạy:

```powershell
Copy-Item .env.example .env
npm.cmd install
npm.cmd run build
npm.cmd run start:prod
```

Có thể dùng npm.cmd run start:dev để theo dõi thay đổi. Swagger trực tiếp tại /api ở các service, gateway không có Swagger tổng hợp. Xem ../docs/API.md để phân biệt API hiện có và hợp đồng dự kiến.

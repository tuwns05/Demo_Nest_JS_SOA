# gateway

Cổng vào HTTP: GET /health tổng hợp; POST /auth/login chuyển tiếp công khai. Các route /auth, /sinhvien, /detai, /dangky còn lại cần JWT. Token sai trả 401, route lạ có token trả 404, upstream mất kết nối trả 503.

## Biến môi trường

| Biến riêng | Ý nghĩa |
| --- | --- |
| PORT | Cổng riêng của tiến trình |
| SERVICE_URL_AUTH, SERVICE_URL_SINHVIEN, SERVICE_URL_DETAI, SERVICE_URL_DANGKY | URL gốc của bốn service |

Cấu hình chung đọc từ ../.env: DB_HOST, DB_NAME bắt buộc cho service kết nối SQL; DB_PORT, DB_INSTANCE, DB_ODBC_DRIVER, DB_USER, DB_PASSWORD, DB_CONNECTION_STRING tùy cấu hình. Gateway và auth dùng JWT_SECRET chung; auth dùng JWT_EXPIRES_IN. Xem mẫu gốc và mẫu riêng, không commit .env.

## Chạy riêng

Từ thư mục gốc, sao chép .env.example thành .env và sửa cấu hình. Trong thư mục gateway chạy:

```powershell
Copy-Item .env.example .env
npm.cmd install
npm.cmd run build
npm.cmd run start:prod
```

Có thể dùng npm.cmd run start:dev để theo dõi thay đổi. Swagger trực tiếp tại /api ở các service, gateway không có Swagger tổng hợp. Xem ../docs/API.md để phân biệt API hiện có và hợp đồng dự kiến.

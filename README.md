# Bài thực hành số 2: Router, Middleware và JWT

RESTful API NestJS minh họa đăng nhập, phát hành JWT và bảo vệ API.

## API

| Method | Endpoint | Chức năng |
|---|---|---|
| `POST` | `/auth/login` | Nhận `username`, `password`; kiểm tra user trong database và trả `access_token`. |
| `GET` | `/auth/profile` | Yêu cầu `Authorization: Bearer <access_token>`; trả về `Hello World`. |

## Vị trí code

- [Router và các endpoint](svc-auth/src/auth/auth.controller.ts)
- [Kiểm tra tài khoản và tạo JWT](svc-auth/src/auth/auth.service.ts)
- [AuthGuard xác thực JWT trong Bearer token](svc-auth/src/auth/auth.guard.ts)
- [Cấu hình JWT và thời hạn token](svc-auth/src/auth/auth.module.ts)
- [LoggerMiddleware ghi method, URL và status của request](svc-auth/src/middleware/logger.middleware.ts)
- [Đăng ký middleware cho AuthController](svc-auth/src/app.module.ts)
- [Kết nối SQL Server dùng chung](shared/database/index.js)

## Chạy và thử API

Trong PowerShell:

```powershell
cd svc-auth
npm.cmd install
npm.cmd run start:dev
```

SQL Server cần có database `SOA_BTH`, instance `LAPTOP-TUNWS\VIETTUAN`, Windows Authentication và ODBC Driver 17. Swagger: [http://localhost:3004/api](http://localhost:3004/api).

Đăng nhập bằng `POST /auth/login`, sao chép `access_token`, rồi gọi `GET /auth/profile` với header `Authorization: Bearer <access_token>`.

## Bảng User

| Cột | Kiểu dữ liệu |
|---|---|
| `IdUser` | `INT PRIMARY KEY` |
| `UserName` | `VARCHAR(255)` |
| `Password` | `VARCHAR(255)` |
| `Token` | `VARCHAR(255)` |

**Lưu ý:** Middleware hiện ghi log request; việc xác thực JWT do `AuthGuard` thực hiện. API hiện so sánh password nhận được trực tiếp với database, chưa mã hóa Base64/MD5 ở client; JWT trả về cũng chưa được lưu vào cột `Token`.

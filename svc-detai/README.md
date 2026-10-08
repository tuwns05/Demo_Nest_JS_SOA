# svc-detai

Dịch vụ CRUD đề tài, chỉ đọc/ghi `SOA_DETAI.dbo.DETAI`. API: `GET/POST /detai`, `GET/PATCH/DELETE /detai/:maDT`. Body tạo gồm `tenDT` (bắt buộc, tối đa 200 ký tự), `moTa` (500), `giangVienHD` (100). PATCH nhận một hoặc nhiều trường trên. ID tự tăng. Các API nghiệp vụ cần Bearer JWT. `GET /detai/health` công khai khi gọi trực tiếp service.

Xóa đề tài không tự xóa đăng ký ở database khác. Hãy xóa đăng ký liên quan trước khi xóa đề tài.

## Biến môi trường

Service đăng ký AuthGuard toàn cục. API nghiệp vụ mới mặc định yêu cầu JWT HS256, kể cả gọi trực tiếp cổng service; chỉ endpoint có `@Public()` được miễn (hiện là health). Token phải có `sub`, `exp`, chữ ký hợp lệ và chưa hết hạn. Header `x-user-id` không thay thế token.

Dùng `JWT_SECRET` ít nhất 32 ký tự, giống svc-auth/gateway/svc-sinhvien, đọc từ `.env` gốc hoặc `.env` service. Gửi `Authorization: Bearer <access_token>` lấy từ `POST /auth/login`. Thiếu hoặc sai token trả 401. Swagger hỗ trợ nút Authorize; hiện chưa có phân quyền vai trò.

| Biến riêng | Ý nghĩa |
| --- | --- |
| PORT | Cổng riêng của tiến trình |
| DB_NAME | SOA_DETAI, đặt trong .env của service |

Cấu hình SQL Server và JWT_SECRET đọc từ ../.env; DB_NAME riêng đọc từ .env của service. Xem mẫu gốc và mẫu riêng, không commit .env.

## Chạy riêng

Từ thư mục gốc, sao chép .env.example thành .env và sửa cấu hình. Trong thư mục svc-detai chạy:

```powershell
Copy-Item .env.example .env
npm.cmd install
npm.cmd run build
npm.cmd run start:prod
```

Có thể dùng npm.cmd run start:dev để theo dõi thay đổi. Swagger trực tiếp tại /api ở các service, gateway không có Swagger tổng hợp. Xem ../docs/API.md để phân biệt API hiện có và hợp đồng dự kiến.

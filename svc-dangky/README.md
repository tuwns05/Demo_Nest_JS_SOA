# svc-dangky

Dịch vụ CRUD đăng ký, chỉ đọc/ghi `SOA_DANGKY.dbo.DANGKY`. API: `GET/POST /dangky`, `GET/PATCH/DELETE /dangky/:maDK`. Body tạo gồm `maSV` (chuỗi, tối đa 20 ký tự), `maDT` (số nguyên dương), tùy chọn `ngayDangKy` (`YYYY-MM-DD`) và `trangThai` (tối đa 50 ký tự). Bỏ ngày khi tạo dùng ngày hiện tại của SQL Server. PATCH nhận một hoặc nhiều trường trên. ID tự tăng.

Khi tạo/sửa, hai HTTP client kiểm tra sinh viên và đề tài tồn tại, chuyển tiếp Bearer JWT. Không tìm thấy trả 404; không kết nối được trả 503 và không ghi dữ liệu. Các API nghiệp vụ cần JWT. `GET /dangky/health` công khai khi gọi trực tiếp service. Chưa chặn đăng ký trùng hoặc tự xóa liên quan giữa database.

## Biến môi trường

Service đăng ký AuthGuard toàn cục. API nghiệp vụ mới mặc định yêu cầu JWT HS256, kể cả gọi trực tiếp cổng service; chỉ endpoint có `@Public()` được miễn (hiện là health). Token phải có `sub`, `exp`, chữ ký hợp lệ và chưa hết hạn. Header `x-user-id` không thay thế token.

Dùng `JWT_SECRET` ít nhất 32 ký tự, giống svc-auth/gateway/svc-sinhvien, đọc từ `.env` gốc hoặc `.env` service. Gửi `Authorization: Bearer <access_token>` lấy từ `POST /auth/login`. Thiếu hoặc sai token trả 401. Swagger hỗ trợ nút Authorize; hiện chưa có phân quyền vai trò.

| Biến riêng | Ý nghĩa |
| --- | --- |
| PORT | Cổng riêng của tiến trình |
| DB_NAME | SOA_DANGKY, đặt trong .env của service |
| SERVICE_URL_SINHVIEN, SERVICE_URL_DETAI | URL gốc cho hai client HTTP, timeout 5 giây |

Cấu hình SQL Server và JWT_SECRET đọc từ ../.env; DB_NAME riêng đọc từ .env của service. Xem mẫu gốc và mẫu riêng, không commit .env.

## Chạy riêng

Từ thư mục gốc, sao chép .env.example thành .env và sửa cấu hình. Trong thư mục svc-dangky chạy:

```powershell
Copy-Item .env.example .env
npm.cmd install
npm.cmd run build
npm.cmd run start:prod
```

Có thể dùng npm.cmd run start:dev để theo dõi thay đổi. Swagger trực tiếp tại /api ở các service, gateway không có Swagger tổng hợp. Xem ../docs/API.md để phân biệt API hiện có và hợp đồng dự kiến.

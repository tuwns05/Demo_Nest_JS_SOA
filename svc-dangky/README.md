# svc-dangky

Sinh viên hủy đăng ký qua `DELETE /dangky/me/:maDK`, chỉ xóa dòng có MaSV trùng token đã xác minh. API trả 404 nếu không tìm thấy đăng ký thuộc sinh viên. Hủy là xóa dòng trong DANGKY, giải phóng sinh viên và đề tài để đăng ký lại; không chỉ cập nhật trạng thái.

`npm run start:dev` và `start:debug` biên dịch vào `dist-dev` qua `tsconfig.dev.json`. `npm run build` tạo bản chạy trong `dist`. Hai thư mục tách riêng để build kiểm tra không xóa file mà tiến trình watch đang chạy. Cache TypeScript nằm trong từng thư mục đầu ra và được làm sạch cùng thư mục đó.

Mỗi sinh viên và mỗi đề tài tối đa một đăng ký. Form quản trị lọc mã sinh viên từ `GET /dangky/registered-students` (chỉ admin). Chạy `db/separate/09-dangky-one-topic-per-student.sql` để thêm UNIQUE(MaSV) cho database cũ; cần giải quyết dữ liệu trùng trước khi áp dụng. API trả 409 khi sinh viên đã có đăng ký, kể cả chọn đề tài khác.

Dịch vụ CRUD đăng ký, chỉ đọc/ghi `SOA_DANGKY.dbo.DANGKY`. API: `GET/POST /dangky`, `GET/PATCH/DELETE /dangky/:maDK`. Body tạo gồm `maSV` (chuỗi, tối đa 20 ký tự), `maDT` (số nguyên dương), tùy chọn `ngayDangKy` (`YYYY-MM-DD`) và `trangThai` (tối đa 50 ký tự). Bỏ ngày khi tạo dùng ngày hiện tại của SQL Server. PATCH nhận một hoặc nhiều trường trên. ID tự tăng.

Khi tạo/sửa, hai HTTP client kiểm tra sinh viên và đề tài tồn tại, chuyển tiếp Bearer JWT. Không tìm thấy trả 404; không kết nối được trả 503 và không ghi dữ liệu. Các API nghiệp vụ cần JWT. `GET /dangky/health` công khai khi gọi trực tiếp service. Mỗi đề tài chỉ nhận một đăng ký: kiểm tra trước khi ghi, đồng thời UNIQUE(MaDT) trong database chặn yêu cầu đồng thời; trả 409 khi đề tài đã có đăng ký. `GET /dangky/occupied-topics` trả các MaDT đã có người đăng ký cho admin và student. Với database cũ, chạy `db/separate/08-dangky-one-student-per-topic.sql` trước khi dùng phiên bản này.

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

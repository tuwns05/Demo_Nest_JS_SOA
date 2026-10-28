# svc-sinhvien

Dịch vụ sinh viên cung cấp CRUD. Các đường dẫn dưới đây dùng được qua gateway cổng 3000 hoặc trực tiếp cổng 3001:

| Method | Đường dẫn | Chức năng |
| --- | --- | --- |
| GET | /sinhvien/health | Kiểm tra DB, công khai tại service |
| POST | /sinhvien | Tạo sinh viên, trả 201 |
| GET | /sinhvien | Danh sách sinh viên, sắp xếp theo MaSV |
| GET | /sinhvien/:maSV | Chi tiết sinh viên |
| PATCH | /sinhvien/:maSV | Cập nhật các trường được gửi |
| DELETE | /sinhvien/:maSV | Xóa sinh viên |

Giữ tương thích `POST /sinhvien/create` và các đường dẫn cũ dưới `/sinhvien/sinh-vien`, bao gồm `/create` và `/health`.

Body tạo gồm `maSV`, `hoTen`, `email`, `lop`, `initialPassword` (ít nhất 12 ký tự). Body cập nhật cho phép `hoTen`, `email`, `lop`; không đổi `maSV`, không chấp nhận body rỗng, giá trị null hoặc trường lạ. Danh sách trả mảng; chi tiết trả đối tượng; tạo/cập nhật/xóa trả `{ message, data }`, không trả mật khẩu.

Khi tạo mới, admin nhập mật khẩu ban đầu ít nhất 12 ký tự và chuyển riêng cho sinh viên. Service gọi `POST /auth/accounts/student` với `{ maSV, initialPassword }`, chuyển tiếp JWT của request. Auth tạo `UserName = maSV`, lưu hash bcrypt của mật khẩu và gán `Role = student`. Sinh viên đăng nhập bằng mã sinh viên và mật khẩu ban đầu, rồi liên kết Google ở trang cá nhân. Không lưu mật khẩu trong bảng SINHVIEN. API Auth yêu cầu JWT vai trò admin.

Chạy `db/add-user-role.sql` trong SSMS trước khi dùng. Với bảng SINHVIEN cũ có MatKhau NOT NULL, chạy thêm `db/student-password-nullable.sql`.

Auth không sẵn sàng: trả 503, chưa chèn sinh viên. Tài khoản trùng với role khác: trả 409. Khi Auth đã tạo tài khoản nhưng phản hồi bị mất hoặc INSERT sinh viên thất bại, tài khoản có thể đã tồn tại; gửi lại yêu cầu tạo sinh viên sẽ dùng lại tài khoản student cùng username, không đổi mật khẩu. Đây là hai thao tác liên dịch vụ, không phải transaction chung. Xóa sinh viên chưa tự xóa tài khoản Auth.

Lỗi: 400 dữ liệu không hợp lệ; 401 JWT thiếu/sai; 404 mã không tồn tại; 409 trùng dữ liệu hoặc xóa bị khóa ngoại chặn. Xóa không tự xóa dữ liệu đăng ký liên quan.

Nếu DB chưa có `SINHVIEN`, chạy `db/sinhvien.sql` trong database ứng dụng. Nếu đã có bảng, kiểm tra các cột `MaSV`, `HoTen`, `Email`, `Lop`, `MatKhau`; script không tự migrate bảng có sẵn. Tài khoản ứng dụng cần quyền SELECT/INSERT/UPDATE/DELETE trên bảng này. Mẫu gọi API nằm trong `docs/api-test.http`.

## Xác thực

Service tự kiểm tra JWT HS256 cho các API nghiệp vụ, kể cả khi gọi trực tiếp cổng 3001. Guard được đăng ký toàn cục: API mới tự yêu cầu token trừ khi được đánh dấu `@Public()`. Endpoint health công khai để giám sát kết nối database (200 hoặc 503).

`JWT_SECRET` trong `.env` gốc phải có ít nhất 32 ký tự và giống khóa dùng bởi `svc-auth` và gateway. JWT phải có `sub`, `exp`, chữ ký hợp lệ và chưa hết hạn. Service xác minh tại chỗ, không gọi `svc-auth` cho mỗi request và không tin header `x-user-id` làm căn cứ xác thực.

Đăng nhập qua `POST http://localhost:3000/auth/login` để lấy `access_token`. Gọi API tạo sinh viên qua gateway hoặc trực tiếp với header `Authorization: Bearer <access_token>`. Trên Swagger `http://localhost:3001/api`, chọn **Authorize** và dán token (không thêm tiền tố Bearer). Thiếu token, token sai hoặc hết hạn trả 401. Hiện chưa có phân quyền theo vai trò.

Khi triển khai, chỉ công khai gateway; giới hạn cổng service trong mạng nội bộ. Health và giao diện Swagger vẫn công khai trên service.

## Biến môi trường

| Biến riêng | Ý nghĩa |
| --- | --- |
| PORT | Cổng riêng của tiến trình |
| SERVICE_URL_AUTH | URL Auth, mặc định http://localhost:3004 |

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

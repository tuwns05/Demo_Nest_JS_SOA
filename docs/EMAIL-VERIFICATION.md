# Đăng ký admin và liên kết Google bằng mã email

## Chuẩn bị

Chạy `db/separate/06-email-verification.sql` trong SSMS trên `SOA_AUTH`, sau `01-auth.sql`. Bảng `EmailVerification` lưu mã dạng HMAC, hạn 10 phút, tối đa 5 lần nhập sai, chờ 60 giây giữa các lần gửi. Mã đã dùng không thể dùng lại. Không cần thêm cột email vào `User`: tài khoản admin dùng `UserName = email`; email sinh viên đã có ở `SOA_SINHVIEN.dbo.SINHVIEN`.

Trong `svc-auth/.env` đặt:

```env
SERVICE_URL_SINHVIEN=http://localhost:3001
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
SMTP_FROM=your-smtp-address
```

`SMTP_PORT=465` dùng TLS ngay khi kết nối; các cổng khác dùng STARTTLS nếu máy chủ hỗ trợ. Dùng mật khẩu ứng dụng của nhà cung cấp email nếu SMTP yêu cầu. Không commit mật khẩu SMTP vào Git. Khởi động lại `svc-auth` sau khi sửa `.env`.

## Sử dụng

- Trang đăng nhập có **Đăng ký bằng email**. Người dùng nhập email, nhận mã, rồi nhập mã và mật khẩu tối thiểu 8 ký tự. Khi xác thực thành công, hệ thống tạo tài khoản `admin`. Đây là luồng công khai dành cho bản demo: bất kỳ ai sở hữu email đều có thể đăng ký admin.
- Khi thêm sinh viên, admin đặt mật khẩu ban đầu ít nhất 12 ký tự và chuyển riêng cho sinh viên. Sinh viên đăng nhập bằng mã sinh viên và mật khẩu đó, vào **trang cá nhân sinh viên**, bấm **Gửi mã xác thực**, nhập mã nhận tại email trong hồ sơ rồi chọn tài khoản Google có cùng email đã xác minh. Từ lần sau có thể đăng nhập bằng Google. Đổi email hồ sơ sau khi gửi mã sẽ làm mã cũ không còn hợp lệ. Tài khoản cũ chưa tự động đổi mật khẩu.

API công khai: `POST /auth/register/admin/request-code` nhận `{ "email": "..." }`; `POST /auth/register/admin/complete` nhận `{ "email": "...", "code": "123456", "password": "..." }`. API sinh viên đã đăng nhập: `POST /auth/google/link/request-code` và `POST /auth/google/link` nhận `{ "credential": "...", "code": "123456" }`.

Vẫn cần chạy `db/separate/05-google-login.sql` và cấu hình `GOOGLE_CLIENT_ID` như trong `docs/GOOGLE-LOGIN.md`.

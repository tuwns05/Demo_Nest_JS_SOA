# Đăng nhập bằng Google

Ứng dụng vẫn hỗ trợ đăng nhập bằng tên tài khoản và mật khẩu. Google chỉ đăng nhập được sau khi người dùng đã liên kết tài khoản Google với tài khoản hiện có.

## Cập nhật database

Trong SSMS, chạy toàn bộ `db/separate/05-google-login.sql` trên SQL Server đang chứa `SOA_AUTH`. Script tự chọn `SOA_AUTH`, tạo bảng `dbo.UserExternalIdentity` nếu chưa có và có thể chạy lại. Chạy sau `01-auth.sql`. Không sửa dữ liệu tài khoản hiện có.

## Tạo Google Client ID

Trong Google Cloud Console, cấu hình Google Auth Platform và tạo OAuth client loại **Web application**. Thêm địa chỉ trình duyệt mở frontend vào **Authorized JavaScript origins**, ví dụ `http://localhost:4200`. Nếu frontend chạy cổng khác, thêm đúng origin đó. Sao chép Client ID dạng `...apps.googleusercontent.com`.

Đặt `GOOGLE_CLIENT_ID` trong `svc-auth/.env` hoặc `.env` gốc. Chỉ Client ID được trả về frontend; luồng này không dùng Client Secret. Khởi động lại `svc-auth` sau khi thay đổi cấu hình.

## Sử dụng

1. Sau khi admin thêm sinh viên và cấp mật khẩu ban đầu, sinh viên đăng nhập bằng mã sinh viên và mật khẩu đó.
2. Trong trang cá nhân sinh viên, bấm **Gửi mã xác thực** và nhập mã nhận tại email trong hồ sơ.
3. Chọn tài khoản Google có cùng email để liên kết.
4. Từ lần sau dùng nút Google tại trang đăng nhập.

Nếu Google chưa được liên kết, API trả 401 và hướng dẫn liên kết. Một Google account chỉ liên kết với một tài khoản nội bộ; mỗi tài khoản nội bộ chỉ liên kết với một Google account. Vai trò và mã sinh viên luôn lấy từ `SOA_AUTH.dbo.User`.

API: `GET /auth/google/config`, `POST /auth/google`, cùng hai endpoint cho sinh viên đã đăng nhập `POST /auth/google/link/request-code` và `POST /auth/google/link`. Endpoint hoàn tất liên kết nhận cả `credential` và `code`. Chạy thêm `db/separate/06-email-verification.sql` và cấu hình SMTP theo `docs/EMAIL-VERIFICATION.md`.

`svc-auth` cần truy cập HTTPS tới `https://www.googleapis.com/oauth2/v3/certs` để xác minh chữ ký ID token của Google. Máy người dùng cần tải được `https://accounts.google.com/gsi/client` trong trình duyệt.

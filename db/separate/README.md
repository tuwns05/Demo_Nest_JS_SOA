# Database riêng cho từng service

Chạy từng file nguyên vẹn trong SQL Server Management Studio (SSMS), trên cùng SQL Server instance đang dùng. Script tự chọn master để tạo database, rồi chọn database mới để tạo bảng. Không cần tự đặt đường dẫn MDF/LDF.

| File | Database | Bảng | Service |
| --- | --- | --- | --- |
| 01-auth.sql | SOA_AUTH | dbo.User | svc-auth |
| 02-sinhvien.sql | SOA_SINHVIEN | dbo.SINHVIEN | svc-sinhvien |
| 03-detai.sql | SOA_DETAI | dbo.DETAI | svc-detai |
| 04-dangky.sql | SOA_DANGKY | dbo.DANGKY | svc-dangky |
| 05-google-login.sql | SOA_AUTH | dbo.UserExternalIdentity | svc-auth (đăng nhập Google) |
| 06-email-verification.sql | SOA_AUTH | dbo.EmailVerification | svc-auth (mã xác thực email) |
| 07-dangky-snapshot.sql | SOA_DANGKY | thêm HoTenSinhVien và TenDeTai vào dbo.DANGKY | svc-dangky |
| 08-dangky-one-student-per-topic.sql | SOA_DANGKY | UNIQUE(MaDT): mỗi đề tài tối đa một đăng ký | svc-dangky |
| 09-dangky-one-topic-per-student.sql | SOA_DANGKY | UNIQUE(MaSV): mỗi sinh viên tối đa một đăng ký | svc-dangky |

Chạy `09-dangky-one-topic-per-student.sql` để bật giới hạn một đăng ký cho mỗi sinh viên trên database cũ. Script dừng nếu có mã sinh viên trùng trong `DANGKY`; không tự xóa dữ liệu. Xem dữ liệu trùng bằng `SELECT MaSV, COUNT(*) FROM dbo.DANGKY GROUP BY MaSV HAVING COUNT(*) > 1`.

Với database đã tồn tại, chạy `08-dangky-one-student-per-topic.sql` trước khi dùng tính năng lọc đề tài còn trống. Script dừng nếu có đề tài đã được nhiều sinh viên đăng ký; kiểm tra các dòng trùng bằng `SELECT MaDT, COUNT(*) FROM dbo.DANGKY GROUP BY MaDT HAVING COUNT(*) > 1`, giải quyết dữ liệu theo nghiệp vụ rồi chạy lại. Script không tự xóa đăng ký.

Ba bảng nghiệp vụ giữ kiểu dữ liệu, độ dài, nullability, identity và default theo DtbDA.sql. Bảng User theo db/schema.sql của backend. Các database và bảng đã tồn tại được giữ nguyên; script không migrate cấu trúc bảng có sẵn.

Các script chỉ tạo database/bảng trống. Không sao chép dữ liệu từ SOA_DATN, không đổi .env và không xóa database cũ. Tài khoản chạy script cần quyền tạo database và bảng. Nếu cần tài khoản demo cho SOA_AUTH mới, chọn SOA_AUTH trong SSMS rồi chạy db/seed.sql. Nếu chuyển dữ liệu User cũ thì giữ nguyên IdUser và password hash, không cần seed lại.

DANGKY không có khóa ngoại đến SINHVIEN/DETAI vì các bảng thuộc database khác. Trước khi chuyển ứng dụng sang database riêng, phải bổ sung nghiệp vụ kiểm tra tồn tại qua API và bảo vệ xóa sinh viên/đề tài còn đăng ký. Cơ chế bắt lỗi SQL 547 hiện tại không còn bảo vệ được các quan hệ đó sau khi tách.

Sau khi chuyển dữ liệu và hoàn thiện kiểm tra quan hệ, đặt DB_NAME trong .env riêng của mỗi service theo bảng trên; các thiết lập máy chủ có thể dùng chung từ .env gốc. Nếu dùng DB_CONNECTION_STRING thì phải đổi database trong chuỗi kết nối hoặc bỏ giá trị ghi đè đó. Khởi động lại service sau khi đổi cấu hình.

Cấu hình hiện tại đã kết nối mỗi service với database riêng theo bảng trên. Các file .env.example cũng có DB_NAME tương ứng. Dữ liệu trong SOA_DATN không tự được chuyển sang database mới; nếu SOA_AUTH.dbo.User trống thì cần tạo tài khoản quản trị với mật khẩu bcrypt hoặc chuyển tài khoản được chọn từ database cũ trước khi đăng nhập.

Lưu ý schema SINHVIEN gốc giới hạn MaSV 20, HoTen 100, Email 100 và Lop 50 ký tự; giới hạn DTO/form hiện tại rộng hơn nên cần đồng bộ trước khi vận hành. Các script giữ nguyên schema gốc, không tự mở rộng cột.

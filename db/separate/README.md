# Database riêng cho từng service

Chạy từng file nguyên vẹn trong SQL Server Management Studio (SSMS), trên cùng SQL Server instance đang dùng. Script tự chọn master để tạo database, rồi chọn database mới để tạo bảng. Không cần tự đặt đường dẫn MDF/LDF.

| File | Database | Bảng | Service |
| --- | --- | --- | --- |
| 01-auth.sql | SOA_AUTH | dbo.User | svc-auth |
| 02-sinhvien.sql | SOA_SINHVIEN | dbo.SINHVIEN | svc-sinhvien |
| 03-detai.sql | SOA_DETAI | dbo.DETAI | svc-detai |
| 04-dangky.sql | SOA_DANGKY | dbo.DANGKY | svc-dangky |

Ba bảng nghiệp vụ giữ kiểu dữ liệu, độ dài, nullability, identity và default theo DtbDA.sql. Bảng User theo db/schema.sql của backend. Các database và bảng đã tồn tại được giữ nguyên; script không migrate cấu trúc bảng có sẵn.

Các script chỉ tạo database/bảng trống. Không sao chép dữ liệu từ SOA_DATN, không đổi .env và không xóa database cũ. Tài khoản chạy script cần quyền tạo database và bảng. Nếu cần tài khoản demo cho SOA_AUTH mới, chọn SOA_AUTH trong SSMS rồi chạy db/seed.sql. Nếu chuyển dữ liệu User cũ thì giữ nguyên IdUser và password hash, không cần seed lại.

DANGKY không có khóa ngoại đến SINHVIEN/DETAI vì các bảng thuộc database khác. Trước khi chuyển ứng dụng sang database riêng, phải bổ sung nghiệp vụ kiểm tra tồn tại qua API và bảo vệ xóa sinh viên/đề tài còn đăng ký. Cơ chế bắt lỗi SQL 547 hiện tại không còn bảo vệ được các quan hệ đó sau khi tách.

Sau khi chuyển dữ liệu và hoàn thiện kiểm tra quan hệ, đặt DB_NAME trong .env riêng của mỗi service theo bảng trên; các thiết lập máy chủ có thể dùng chung từ .env gốc. Nếu dùng DB_CONNECTION_STRING thì phải đổi database trong chuỗi kết nối hoặc bỏ giá trị ghi đè đó. Khởi động lại service sau khi đổi cấu hình.

Cấu hình hiện tại đã kết nối mỗi service với database riêng theo bảng trên. Các file .env.example cũng có DB_NAME tương ứng. Dữ liệu trong SOA_DATN không tự được chuyển sang database mới; nếu SOA_AUTH.dbo.User trống thì cần tạo tài khoản quản trị với mật khẩu bcrypt hoặc chuyển tài khoản được chọn từ database cũ trước khi đăng nhập.

Lưu ý schema SINHVIEN gốc giới hạn MaSV 20, HoTen 100, Email 100 và Lop 50 ký tự; giới hạn DTO/form hiện tại rộng hơn nên cần đồng bộ trước khi vận hành. Các script giữ nguyên schema gốc, không tự mở rộng cột.

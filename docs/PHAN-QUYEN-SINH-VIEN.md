# Phân quyền và cổng sinh viên

## Chuẩn bị

1. Chạy `db/enable-roles.sql` bằng SSMS. Script thêm Role nếu thiếu và gán riêng tài khoản `demo` thành `admin`. Không đổi mật khẩu.
2. Tài khoản quản trị khác cần được gán Role = 'admin' bằng UPDATE theo đúng UserName. Không tự nâng tất cả tài khoản cũ lên admin.
3. Tài khoản sinh viên tạo qua chức năng thêm sinh viên đã có Role = 'student', UserName bằng MaSV. Nếu gán thủ công, UserName phải khớp MaSV trong SOA_SINHVIEN.
4. Khởi động lại năm backend và frontend, đăng xuất rồi đăng nhập lại để lấy JWT có role. Token cũ không có role bị từ chối.

## Quyền

| Chức năng | admin | student |
| --- | --- | --- |
| Quản lý sinh viên, tài khoản sinh viên | Có | Không |
| Xem hồ sơ sinh viên | Tất cả | Chỉ bản thân |
| Xem đề tài | Có | Có |
| Thêm/sửa/xóa đề tài | Có | Không |
| Quản lý, duyệt đăng ký | Có | Không |
| Tạo đăng ký từ trang sinh viên | Không | Chỉ bản thân, trạng thái Chờ duyệt |
| Xem danh sách đăng ký | Tất cả | Chỉ bản thân |

Guard ở từng service xác minh chữ ký JWT và role, kể cả khi gọi trực tiếp không qua gateway. API nghiệp vụ mặc định yêu cầu admin; các API cho sinh viên được khai báo tường minh. Role trống/khác admin hoặc student bị từ chối, không mặc định thành admin.

## API sinh viên

- `GET /sinhvien/me`: hồ sơ theo maSV trong JWT.
- `GET /detai`, `GET /detai/:maDT`: xem đề tài.
- `GET /dangky/me`: truy vấn đăng ký với điều kiện MaSV bằng định danh trong JWT.
- `POST /dangky/me`: body chỉ gồm `{ "maDT": 1 }`. Backend tự lấy MaSV từ JWT, ngày hiện tại, trạng thái Chờ duyệt. Các trường maSV/trangThai/ngayDangKy từ client bị từ chối.

Đăng ký vẫn kiểm tra sinh viên và đề tài qua HTTP như luồng quản trị. Không thêm quy tắc giới hạn mỗi sinh viên chỉ một đề tài; quy tắc hiện có chặn đăng ký trùng cùng đề tài. Trang hiển thị danh sách đăng ký của mình, không cung cấp thao tác tự duyệt, sửa hay xóa.

## Giao diện

- admin đăng nhập vào `/tong-quan` hoặc trang returnUrl được phép.
- student luôn đăng nhập vào `/sinh-vien-ca-nhan`, gồm hồ sơ, các thẻ đề tài và lịch sử đăng ký.
- Menu và route quản trị bị chặn với student; backend đồng thời kiểm tra quyền.
- Khi một API tải lỗi, các phần đã tải được vẫn hiển thị và có nút tải lại.

## Demo

Đăng nhập demo, thêm sinh viên SV001. Đăng xuất, đăng nhập SV001/SV001. Kiểm tra hồ sơ chỉ có SV001, đăng ký một đề tài và xem trạng thái Chờ duyệt. Thử mở /sinh-vien hoặc gọi POST /detai bằng token sinh viên: bị chặn. Đăng nhập lại demo để xem và duyệt đăng ký.

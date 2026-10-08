# Hợp đồng API

Gateway: `http://localhost:3000`. Chỉ POST /auth/login và GET /health công khai. Route khác cần `Authorization: Bearer <token>`.

| Method | Route | Phản hồi hiện có |
| --- | --- | --- |
| POST | /auth/login | Body user/password của tài khoản quản trị trong dbo.User; 200 access_token, expires_in, token_type; sai thông tin 401 |
| GET | /auth/profile | Chuỗi protected route; chưa phải hồ sơ người dùng |
| GET | /health | 200 status ok khi cả bốn up; 503 degraded nếu có down |
| GET | /auth/health | Kiểm tra DB; 200 hoặc 503 |
| GET | /sinhvien/health | Kiểm tra DB; 200 hoặc 503 |
| POST | /sinhvien | Body maSV/hoTen/email/lop/matKhau; 201 message và data |
| GET | /sinhvien | 200 mảng sinh viên, không có mật khẩu |
| GET | /sinhvien/:maSV | 200 thông tin sinh viên; 404 nếu không tồn tại |
| PATCH | /sinhvien/:maSV | Cập nhật hoTen/email/lop/matKhau; 200 message và data; 400 nếu body rỗng/sai |
| DELETE | /sinhvien/:maSV | 200 message và data; 404 không tồn tại; 409 nếu có khóa ngoại tham chiếu |
| GET | /detai/health | Kiểm tra DB; 200 hoặc 503 |
| GET | /dangky/health | Kiểm tra DB; 200 hoặc 503 |
| GET | /detai | 200 mảng đề tài |
| GET | /detai/:maDT | 200 đề tài; 404 không tồn tại |
| POST | /detai | tenDT bắt buộc; moTa, giangVienHD tùy chọn; 201 message/data |
| PATCH | /detai/:maDT | Sửa các trường như tạo; 200 message/data |
| DELETE | /detai/:maDT | 200 message/data; 404 không tồn tại |
| GET | /dangky | 200 mảng đăng ký |
| GET | /dangky/:maDK | 200 đăng ký; 404 không tồn tại |
| POST | /dangky | maSV (chuỗi), maDT (số) bắt buộc; ngayDangKy, trangThai tùy chọn; 201 message/data |
| PATCH | /dangky/:maDK | Sửa các trường như tạo; 200 message/data |
| DELETE | /dangky/:maDK | 200 message/data; 404 không tồn tại |

Swagger trực tiếp ở /api từng service, chưa có Swagger tổng hợp. Route lạ có token trả 404; token thiếu/sai trả 401 trước định tuyến. Lỗi kết nối upstream trả 503. Gateway xóa x-user-id client và thay bằng sub đã xác minh.

Các API CRUD đều cần JWT, kể cả truy cập trực tiếp service. Body sai, trường thừa hoặc PATCH rỗng trả 400. Dữ liệu trả về dùng tên cột SQL (MaDT, TenDT, MaDK, MaSV...). Ngày đăng ký định dạng YYYY-MM-DD; bỏ ngày khi tạo dùng GETDATE(). Tạo/sửa đăng ký gọi svc-sinhvien và svc-detai kèm token để kiểm tra mã; mã không tồn tại trả 404, dịch vụ không kết nối được trả 503.

Chưa có phân trang, chặn đăng ký trùng hoặc tự xóa liên quan giữa database. Xóa đăng ký trước khi xóa sinh viên/đề tài để tránh dữ liệu mồ côi. Giữ API tạo sinh viên cũ `/sinhvien/sinh-vien/create`.

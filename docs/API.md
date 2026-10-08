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

Swagger trực tiếp ở /api từng service, chưa có Swagger tổng hợp. Route lạ có token trả 404; token thiếu/sai trả 401 trước định tuyến. Lỗi kết nối upstream trả 503. Gateway xóa x-user-id client và thay bằng sub đã xác minh.

## Hợp đồng dự kiến, chưa có endpoint

| Method | Route | Thành công dự kiến | Lỗi dự kiến |
| --- | --- | --- | --- |
| GET | /detai/:id | 200 JSON có id đề tài | 404 không có đề tài; 503 lỗi kết nối |

Sinh viên dùng mã `maSV` dạng chuỗi và đã có CRUD; xem `svc-sinhvien/README.md`. Giữ API tạo cũ `/sinhvien/sinh-vien/create`. Đề tài chưa có endpoint lấy theo mã; đăng ký chưa có CRUD. Danh sách sinh viên chưa phân trang. Gateway giữ query nhưng chưa có nghiệp vụ xử lý query.

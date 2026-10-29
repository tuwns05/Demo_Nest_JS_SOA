# Hợp đồng API

Phân quyền admin/student và các endpoint cá nhân được mô tả tại [Phân quyền sinh viên](PHAN-QUYEN-SINH-VIEN.md). API quản trị yêu cầu admin; student dùng /sinhvien/me, /dangky/me và API đọc đề tài. JWT cũ cần đăng nhập lại.

Gateway: `http://localhost:3000`. Đăng nhập qua `POST /auth/login` hoặc `POST /auth/google`; `GET /auth/google/config` và `GET /health` công khai. Route khác cần `Authorization: Bearer <token>`.

| Method | Route | Phản hồi hiện có |
| --- | --- | --- |
| POST | /auth/login | Body user/password của tài khoản quản trị trong dbo.User; 200 access_token, expires_in, token_type; sai thông tin 401 |
| GET | /auth/profile | Chuỗi protected route; chưa phải hồ sơ người dùng |
| POST | /auth/accounts/student | Yêu cầu JWT, body maSV; tạo tài khoản role student, mật khẩu ban đầu bằng maSV (bcrypt); dùng lại tài khoản student đã có mà không đổi mật khẩu; 409 nếu username thuộc role khác |
| GET | /health | 200 status ok khi cả bốn up; 503 degraded nếu có down |
| GET | /auth/health | Kiểm tra DB; 200 hoặc 503 |
| GET | /sinhvien/health | Kiểm tra DB; 200 hoặc 503 |
| POST | /sinhvien | Body maSV/hoTen/email/lop; tự tạo tài khoản Auth với username và mật khẩu ban đầu bằng maSV; 201 message và data |
| GET | /sinhvien | 200 mảng sinh viên, không có mật khẩu |
| GET | /sinhvien/:maSV | 200 thông tin sinh viên; 404 nếu không tồn tại |
| PATCH | /sinhvien/:maSV | Cập nhật hoTen/email/lop; 200 message và data; 400 nếu body rỗng/sai |
| DELETE | /sinhvien/:maSV | 200 message và data; 404 không tồn tại; 409 nếu có đăng ký; 503 nếu không kiểm tra được đăng ký |
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

Chưa có phân trang. Mỗi đề tài tối đa một đăng ký, bảo vệ bằng `UNIQUE(MaDT)` trong `SOA_DANGKY.dbo.DANGKY`; đăng ký vào đề tài đã có người trả 409, kể cả khi có yêu cầu đồng thời. Với database cũ, chạy `db/separate/08-dangky-one-student-per-topic.sql`. Xóa đăng ký trước khi xóa sinh viên/đề tài. Giữ API tạo sinh viên cũ `/sinhvien/sinh-vien/create`.

`GET /dangky/occupied-topics` dành cho admin và student, trả mảng mã đề tài đã có đăng ký, ví dụ `[2, 7]`, không kèm thông tin sinh viên. Form tạo đăng ký quản trị và danh sách chọn đề tài của sinh viên loại các mã này khỏi danh sách từ `/detai`. Xóa đăng ký sẽ giải phóng đề tài sau khi tải lại danh sách. Trạng thái đăng ký không thay đổi việc chiếm chỗ; mọi dòng còn trong `DANGKY` đều giữ đề tài.

Mỗi sinh viên cũng chỉ có tối đa một đăng ký, bảo vệ bằng kiểm tra API và `UNIQUE(MaSV)`. Với database cũ, chạy `db/separate/09-dangky-one-topic-per-student.sql` sau khi xử lý các mã sinh viên đang có nhiều đăng ký. `GET /dangky/registered-students` chỉ dành cho admin, trả các mã sinh viên đã đăng ký để form tạo loại khỏi ô chọn; API này không cung cấp cho student. Trang sinh viên dựa vào `/dangky/me` để khóa đăng ký thêm. Khi gặp 409, giao diện tải lại dữ liệu để loại sinh viên hoặc đề tài vừa được đăng ký ở phiên khác. Xóa đăng ký sẽ cho phép sinh viên đăng ký lại sau khi tải lại danh sách; đổi trạng thái không giải phóng đăng ký.

# Kiểm tra đăng ký trước khi xóa sinh viên hoặc đề tài

Sinh viên có thể hủy từng đăng ký của chính mình qua `DELETE /dangky/me/:maDK`. API lấy MaSV từ JWT, xóa với cả MaDK và MaSV trong cùng câu lệnh SQL, trả 404 nếu đăng ký không tồn tại hoặc thuộc sinh viên khác. Không giới hạn theo trạng thái đăng ký. Sau khi xác nhận hủy trên giao diện, dòng đăng ký bị xóa khỏi DANGKY; trang tải lại `/dangky/me`, `/detai` và `/dangky/occupied-topics` để cho chọn đề tài còn trống. Lỗi hủy không xóa dòng khỏi giao diện; 404 tải lại để đồng bộ nếu đăng ký đã bị xóa ở phiên khác.

`svc-dangky` cung cấp `GET /dangky/exists/student/:maSV` và `GET /dangky/exists/topic/:maDT` cho tài khoản quản trị. Mỗi API trả `{ "exists": true|false }` và chỉ kiểm tra một dòng trong database. `svc-sinhvien` và `svc-detai` dùng các API này trước khi xóa; nếu có đăng ký, lệnh xóa trả `409`. Nếu không kiểm tra được (lỗi mạng hoặc `svc-dangky` không sẵn sàng), lệnh xóa dừng và trả lỗi. Cấu hình `SERVICE_URL_DANGKY` trên hai service; mặc định trong `.env.example` là `http://localhost:3003`.

Kiểm tra trước khi xóa không phải giao dịch xuyên service. Nếu đăng ký mới được tạo đồng thời giữa bước kiểm tra và bước xóa, vẫn có thể phát sinh dữ liệu tham chiếu không còn tồn tại.

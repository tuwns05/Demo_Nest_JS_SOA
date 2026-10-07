# Hợp đồng API

Gateway: `http://localhost:3000`. Chỉ POST /auth/login và GET /health công khai. Route khác cần `Authorization: Bearer <token>`.

| Method | Route | Phản hồi hiện có |
| --- | --- | --- |
| POST | /auth/login | Body username/password; 200 access_token, expires_in, token_type; sai thông tin 401 |
| GET | /auth/profile | Chuỗi protected route; chưa phải hồ sơ người dùng |
| GET | /health | 200 status ok khi cả bốn up; 503 degraded nếu có down |
| GET | /auth/health | Kiểm tra DB; 200 hoặc 503 |
| GET | /sinhvien/health | Kiểm tra DB; 200 hoặc 503 |
| GET | /detai/health | Kiểm tra DB; 200 hoặc 503 |
| GET | /dangky/health | Kiểm tra DB; 200 hoặc 503 |

Swagger trực tiếp ở /api từng service, chưa có Swagger tổng hợp. Route lạ có token trả 404; token thiếu/sai trả 401 trước định tuyến. Lỗi kết nối upstream trả 503. Gateway xóa x-user-id client và thay bằng sub đã xác minh.

## Hợp đồng dự kiến, chưa có endpoint

| Method | Route | Thành công dự kiến | Lỗi dự kiến |
| --- | --- | --- | --- |
| GET | /sinhvien/:id | 200 JSON có id sinh viên | 404 không có sinh viên; 503 lỗi kết nối |
| GET | /detai/:id | 200 JSON có id đề tài | 404 không có đề tài; 503 lỗi kết nối |

Chưa chốt trường nghiệp vụ và kiểu ID; client nhận string/number, trả JSON upstream. Service thật hiện trả 404 cho hai route này. Chưa có API tạo đăng ký, CRUD hay phân trang. Gateway giữ query nhưng chưa có nghiệp vụ xử lý query.

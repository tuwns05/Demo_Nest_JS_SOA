# Kiến trúc SOA

SOA chia hệ thống thành dịch vụ có trách nhiệm và hợp đồng giao tiếp rõ ràng. Repo dùng HTTP; SOA không bắt buộc có ESB.

| Đặc điểm | Bằng chứng trong code |
| --- | --- |
| Tiến trình độc lập | Mỗi thư mục service có package.json, src/main.ts và PORT riêng |
| Cổng vào tập trung | gateway/src/app.controller.ts ánh xạ tài nguyên sang URL |
| Hợp đồng HTTP | Controller auth và health, docs/API.md |
| Hạ tầng chung | shared/database cung cấp register() và query có tham số |
| Gọi chéo | svc-dangky/src/clients, chưa có endpoint đăng ký |
| Xác thực | Auth ký JWT, gateway xác minh trước khi chuyển tiếp |

Gateway định tuyến, xác thực và kiểm tra health. ESB thường có chuyển đổi thông điệp, tích hợp nhiều giao thức và điều phối tập trung; repo chưa có các khả năng đó. Demo dùng chung DB và thư viện, chưa độc lập vận hành hoàn toàn như một hệ microservices trưởng thành.

## Đăng nhập

```mermaid
sequenceDiagram
  Client->>Gateway: POST /auth/login
  Gateway->>Auth: username/password
  Auth->>SQL: SELECT User với @username
  SQL-->>Auth: Bản ghi chứa bcrypt hash
  Auth->>Auth: bcrypt.compare, ký JWT
  Auth-->>Client: Token hoặc 401 qua gateway
```

## API có token

```mermaid
sequenceDiagram
  Client->>Gateway: GET /sinhvien/health + Bearer
  Gateway->>Gateway: Verify JWT, xóa header x-user-id client
  Gateway->>SinhVien: Gắn sub làm x-user-id, giữ query
  SinhVien->>SQL: SELECT 1
  SinhVien-->>Client: Health qua gateway
```

Token sai bị chặn trước khi gọi service. Service nghiệp vụ chưa tự kiểm tra JWT; tầng triển khai phải hạn chế truy cập trực tiếp. Chưa có mTLS.

## Tạo đăng ký: luồng dự kiến, chưa triển khai

```mermaid
sequenceDiagram
  Client->>Gateway: Tạo đăng ký (dự kiến)
  Gateway->>DangKy: Sau xác thực
  DangKy->>SinhVien: GET /sinhvien/:id qua client
  SinhVien-->>DangKy: Dữ liệu hoặc 404
  DangKy->>DeTai: GET /detai/:id qua client
  DeTai-->>DangKy: Dữ liệu hoặc 404
  DangKy->>SQL: Ghi DANGKY (dự kiến)
```

Hiện chỉ có client HTTP; endpoint tra cứu và tạo đăng ký chưa có. Chưa xử lý giao dịch phân tán, saga hoặc tranh chấp chỉ tiêu.

## Một service dừng

```mermaid
sequenceDiagram
  Client->>Gateway: GET /health
  par Timeout riêng 2 giây
    Gateway->>Auth: /auth/health
    Gateway->>SinhVien: /sinhvien/health
    Gateway->>DeTai: /detai/health
    Gateway->>DangKy: /dangky/health
  end
  Gateway-->>Client: 503 degraded, service lỗi down
  Client->>Gateway: Route service dừng + token
  Gateway-->>Client: 503
```

Route của các service còn sống tiếp tục hoạt động. SQL Server dùng chung vẫn là điểm lỗi chung; health không tự phục hồi dịch vụ.

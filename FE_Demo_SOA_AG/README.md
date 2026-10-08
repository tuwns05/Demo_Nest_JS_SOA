# SOA Campus · Angular frontend

Giao diện Angular cho backend NestJS hiện có. Mỗi service backend có component và Angular service riêng. Dữ liệu API được giữ bằng signals trong service; component phụ trách hiển thị và form.

| Backend      | Component                       | Angular service | Chức năng                           |
| ------------ | ------------------------------- | --------------- | ----------------------------------- |
| gateway      | GatewayComponent                | GatewayService  | Tổng quan, health 4 service         |
| svc-auth     | AuthComponent, AccountComponent | AuthService     | Đăng nhập, đăng xuất                |
| svc-sinhvien | SinhVienComponent               | SinhVienService | Danh sách, chi tiết, tạo, sửa, xóa  |
| svc-detai    | DeTaiComponent                  | DeTaiService    | Danh sách, chi tiết, tạo, sửa, xóa  |
| svc-dangky   | DangKyComponent                 | DangKyService   | CRUD đăng ký, chọn sinh viên/đề tài |

## Chạy

Khởi động backend theo README ở thư mục gốc. Chuẩn bị bảng SINHVIEN bằng db/sinhvien.sql nếu chưa có. Trong thư mục frontend:

```powershell
npm.cmd install
npm.cmd start
```

Mở http://localhost:4200. Đăng nhập bằng tài khoản quản trị đã tạo trong SOA_AUTH.dbo.User (ví dụ admin / admin nếu đã tạo theo hướng dẫn).

Form đăng nhập dành cho quản trị, gửi `{ user, password }` đến `/api/auth/login`. `user` là tên tài khoản `UserName` trong bảng User; không phải mã sinh viên. Thêm sinh viên không tự tạo tài khoản quản trị.

Frontend gọi /api/*, Angular dev server chuyển tiếp đến http://localhost:3000 và bỏ tiền tố /api. Cấu hình nằm ở proxy.conf.json; không cần thay đổi CORS backend cho môi trường phát triển. Nếu đổi cổng gateway, sửa target rồi khởi động lại frontend.

## Cấu trúc

- src/app/features/: component và service cho auth, gateway, sinh-vien, de-tai, dang-ky.
- src/app/core/: cấu hình API, phiên, HTTP interceptor, route guard, health store dùng chung.
- src/app/shared/: khối trạng thái và hỗ trợ điều hướng bàn phím trong hộp thoại.
- src/styles.css và src/styles/forms.css: giao diện dùng chung.

SessionService giữ JWT trong sessionStorage của tab và bộ nhớ, tự kết thúc phiên theo exp. Auth interceptor chỉ gửi Bearer đến /api/*; HTTP 401 từ API được bảo vệ đưa về đăng nhập. Route guard bảo vệ các trang nghiệp vụ; backend vẫn là nơi xác minh token và kiểm soát truy cập. Dữ liệu đã tải được xóa khi đăng xuất.

CRUD dùng đúng hợp đồng backend: dữ liệu trả về MaSV/HoTen/Email/Lop; body gửi maSV/hoTen/email/lop/matKhau. Khi sửa, mật khẩu trống được bỏ khỏi body. Mật khẩu không hiển thị lại. Tìm kiếm/lọc lớp xử lý trên danh sách đã tải; chưa có phân trang phía server.

Trang Đề tài gọi GET/POST /detai và GET/PATCH/DELETE /detai/:maDT. Trang Đăng ký gọi các API tương ứng /dangky, đồng thời tải /sinhvien và /detai để chọn mã từ danh sách. Body đăng ký gửi maDT dạng số; khi tạo, bỏ ngày trống để backend dùng ngày hiện tại. Mỗi Angular service giữ danh sách riêng và cập nhật sau thao tác thành công; thất bại giữ form và hiển thị lỗi. Cần thêm sinh viên và đề tài trước khi đăng ký. Xóa đăng ký liên quan trước khi xóa đề tài/sinh viên vì backend chưa tự xóa giữa database.

Gateway trả 503 kèm bản tổng hợp vẫn được hiển thị để biết service nào không khả dụng.

## Kiểm tra

```powershell
npm.cmd run build
npm.cmd test -- --watch=false
```

Build nằm trong dist/FE_Demo_SOA_AG/browser. Khi tự triển khai bản build, cấu hình máy chủ phục vụ frontend: chuyển /api/* đến gateway và bỏ /api, còn route giao diện trả index.html. Proxy trong Angular dev server chỉ dùng khi chạy npm start.

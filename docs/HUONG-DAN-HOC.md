# Lộ trình đọc code

1. Đọc README.md, docs/KIEN-TRUC.md để biết ranh giới và giới hạn demo.
2. Xem package.json, tsconfig.json và tsconfig.build.json từng service: ESM cần import .js, start:prod phải khớp đầu ra build.
3. Đọc svc-sinhvien/src/main.ts: NestFactory, global prefix, ValidationPipe, exception filter, Swagger và shutdown hooks.
4. Đọc svc-sinhvien/src/app.module.ts: @Module kết nối imports, controllers, providers; ConfigModule đọc .env riêng rồi .env gốc. Biến process environment ưu tiên hơn file.
5. Đọc svc-sinhvien/src/app.controller.ts và app.service.ts: controller nhận HTTP, service thực hiện health; constructor nhận provider qua dependency injection.
6. Đọc shared/database/src/index.ts: pool, truy vấn tham số và lifecycle; register() trả DynamicModule.
7. Đọc svc-auth/src/auth/auth.module.ts, auth.service.ts, auth.guard.ts, decorators/public.decorator.ts: JWT bất đồng bộ, bcrypt và metadata công khai.
8. Đọc gateway/src/auth.guard.ts, app.module.ts, app.controller.ts: APP_GUARD, middleware, lọc header và giữ query.
9. Đọc gateway/src/app.service.ts: Promise.all kiểm tra song song và timeout.
10. Đọc svc-dangky/src/clients: HttpModule/HttpService, ConfigService và ánh xạ lỗi HTTP.
11. Thử docs/api-test.http, đối chiếu docs/API.md trước khi thiết kế nghiệp vụ.

| Khái niệm NestJS | Ý nghĩa |
| --- | --- |
| Decorator | @Controller, @Get, @Module mô tả lớp và route |
| Provider | Đối tượng do container quản lý, thường có @Injectable |
| Module | Nhóm chức năng, kiểm soát imports và exports |
| DynamicModule | Cấu hình module trả về từ register() |
| Guard | Cho phép hoặc chặn request trước controller |
| Middleware | Ghi method, URL, status và thời gian trong vòng đời HTTP |
| Pipe | Kiểm tra/chuyển đổi đầu vào; DTO cần decorator validation |
| Exception filter | Chuẩn hóa lỗi thành phản hồi HTTP |
| Observable | Kiểu trả về HttpService; có thể dùng firstValueFrom hoặc axiosRef |
| Lifecycle | Mở pool khi boot, đóng khi shutdown |
| Swagger | Mô tả API, không tự tạo endpoint hay bảo mật |

Thực hành thiếu token, token sai, giả header, giữ query và tắt service. SQL Server thật cần thiết để xác minh kết nối ODBC và đăng nhập tích hợp.

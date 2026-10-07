# Báo cáo nghiệm thu nền tảng

Ngày kiểm tra: 07/10/2026. Nền ban đầu: b5d09390. Node.js v24.15.0, npm 11.12.1, Windows PowerShell. Phạm vi chỉ hạ tầng, không thêm CRUD hoặc endpoint nghiệp vụ.

## Kết quả từng mục

| Mục | Kết quả | Commit |
| --- | --- | --- |
| 1. Phụ thuộc | Cài không cờ thành công cả năm ứng dụng; axios/config đúng ^12.0.1; build thành công | bbb87dcc |
| 2. Tài liệu | Viết lại UTF-8, đủ README và tài liệu API/hỏi đáp (25 câu); build cả năm thành công | a0925483 |
| 3. Gateway | Toàn bộ ca giả lập đạt; build cả năm, entry dist/main.js tồn tại | 29053343 |
| 4. Database | TypeScript build, file dependency hoạt động; thiếu DB_NAME làm service dừng và nhắc .env.example | 93ac5a13 |
| 5. Auth | HTTP bcrypt với DB giả thành công; sai mật khẩu 401, đầu vào rỗng 400; thời hạn JWT theo cấu hình; secret yếu chặn boot | 2a60ed6c |
| 6. Môi trường | Biến chung ở gốc; biến riêng ở service; thiếu .env dừng trước khi tạo tiến trình; build cả năm thành công | c48a2a11 |
| 7. HTTP client | Hai client đạt 200, ID được encode, 404 rõ nghĩa, timeout 5 giây/mất kết nối 503; build thành công | 06aae19c |
| 8. Swagger | /api và /api-json chạy được trên cả bốn service qua entry production với DB giả; tag health và Bearer auth có trong spec; file HTTP đủ các ca | Commit chứa báo cáo này |

Theo mục 6, JWT_SECRET cuối cùng chỉ nằm trong mẫu cấu hình chung ở gốc, gateway đọc qua ConfigModule; không còn khai báo trùng trong mẫu riêng.

## Sáu tiêu chí nghiệm thu

1. **Đạt:** npm.cmd install không cờ ở gateway, bốn service và shared/database; build thành công. Npm báo lỗ hổng phụ thuộc hiện hữu: gateway 0; auth/shared 3 moderate; mỗi service nghiệp vụ 8 (2 low, 4 moderate, 2 high). Chưa chạy audit fix vì có thể thay phiên bản ngoài phạm vi yêu cầu.
2. **Đạt:** giải mã UTF-8 nghiêm ngặt mọi Markdown của repo; không có ký tự thay thế hoặc dấu hỏi chen trong từ. Dấu hỏi cuối câu hỏi bảo vệ là dấu câu hợp lệ. Máy không có file/grep nên dùng Python và rg để kiểm tra tương đương.
3. **Đạt với service giả:** thiếu token và token rác 401, upstream nhận 0 request; token hợp lệ 200; x-user-id 999 được thay bằng 42 từ JWT; header ngoài danh sách bị bỏ; query giữ nguyên; login công khai; health riêng qua gateway cần token; route lạ có token 404; một service dừng thì health 503/down, route đó 503, service khác 200; các health bị treo timeout song song khoảng 2 giây.
4. **Đạt:** shared/database không có mặc định host/database cũ; không có dấu việc dở dang trong mã và tài liệu được theo dõi. Provider DatabaseService chỉ khai báo ở DynamicModule.
5. **Đạt logic bằng dữ liệu giả, chưa xác minh SQL thật:** bcrypt hash trong seed khớp mật khẩu minh họa; HTTP login phát JWT đúng; mật khẩu sai 401; secret rỗng, ngắn và giá trị mẫu đều chặn boot. Máy có instance SQL Server VIETTUAN đang chạy nhưng chưa có .env hoặc database thử nghiệm được chỉ định, nên chưa chạy schema/seed hoặc truy vấn đăng nhập thật.
6. **Đạt:** Git chỉ theo dõi .env.example, không có .env thật; không tạo secret cố định cho test, dùng randomBytes trong tiến trình. Mật khẩu demo công khai chỉ là dữ liệu minh họa theo yêu cầu, không phải thông tin người dùng thật.

## Lệnh chạy lại từng mục

Chạy từ thư mục gốc. Nếu Windows chặn .ps1, dùng ExecutionPolicy Bypass riêng cho tiến trình như dưới; không thay chính sách hệ thống.

```powershell
# Mục 1: package chung được cài/build trước, sau đó năm ứng dụng.
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/install-all.ps1

# Build package chung và toàn bộ ứng dụng; cũng dùng sau mỗi thay đổi tương ứng.
foreach ($dir in @('shared/database','gateway','svc-auth','svc-sinhvien','svc-detai','svc-dangky')) {
  Push-Location $dir
  try {
    npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw "Build thất bại: $dir" }
  } finally { Pop-Location }
}

# Mục 2: chỉ quét Markdown của repo, không quét node_modules.
python -c "import subprocess,pathlib; files=[pathlib.Path(p) for p in subprocess.check_output(['git','ls-files'],text=True).splitlines() if p.endswith('.md')]; [p.read_text(encoding='utf-8') for p in files]; print('UTF-8:',len(files))"

# Mục 3: tự tạo bốn upstream và gateway ở cổng trống, tự dọn tiến trình.
node scripts/check-gateway.mjs

# Mục 4: trong phiên PowerShell thử riêng, kiểm tra thiếu DB_NAME.
$env:DB_HOST = 'test-host'
$env:DB_NAME = ''
Push-Location svc-sinhvien
try { npm.cmd run start:prod } finally { Pop-Location }
# Mong đợi: thoát lỗi, thông báo DB_NAME và .env.example.
# Đóng phiên thử để không giữ các biến thử nghiệm.

# Mục 5: HTTP auth dùng DB giả, không ghi SQL Server thật.
node scripts/check-auth.mjs
# SQL thật: theo db/README.md, sau đó gửi login trong docs/api-test.http.

# Mục 6: khi thiếu .env, lệnh sau phải dừng và liệt kê tệp thiếu.
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-all.ps1
# Nếu đã đủ .env, lệnh này sẽ thực sự khởi động các service.

# Mục 7: upstream HTTP thật trong test, không cần SQL.
node scripts/check-clients.mjs

# Mục 8: entry production và Swagger, DB được thay bởi fixture chỉ trong test.
node scripts/check-swagger.mjs
```

## Chưa kiểm tra được

- Chưa chạy schema.sql và seed.sql hai lần trên SQL Server thật, vì chưa có database được chọn để thay đổi dữ liệu.
- Chưa kiểm tra kết nối ODBC thật, Windows/SQL Authentication và đóng pool thật; test thiếu cấu hình chạy trước khi nạp driver.
- Chưa kiểm tra đăng nhập tích hợp qua gateway với tài khoản SQL đã seed; auth HTTP hiện dùng DB giả, gateway HTTP dùng upstream giả.
- Chưa dùng giao diện REST Client để chạy trực tiếp docs/api-test.http; các mã HTTP tương ứng đã được kiểm tra bằng script.
- Chưa vận hành start-all với cấu hình thật; đã kiểm tra nhánh thiếu cấu hình dừng trước khi khởi động.

Không thêm CRUD để làm endpoint dự kiến chạy được. GET /sinhvien/:id và GET /detai/:id vẫn chưa triển khai, service thật trả 404.

## Danh sách tệp thay đổi

Danh sách dưới đây so với b5d09390; A là tạo, M là sửa, D là xóa. svc-detai/README.md đã thay toàn bộ nội dung mẫu, nên Git ghi M.

```text
M	.env.example
M	README.md
A	db/README.md
A	db/schema.sql
A	db/seed.sql
A	docs/API.md
A	docs/HOI-DAP-BAO-VE.md
M	docs/HUONG-DAN-HOC.md
M	docs/KIEN-TRUC.md
M	docs/api-test.http
M	gateway/.env.example
A	gateway/README.md
A	gateway/nest-cli.json
M	gateway/package-lock.json
M	gateway/package.json
M	gateway/src/app.controller.ts
M	gateway/src/app.module.ts
M	gateway/src/app.service.ts
A	gateway/src/auth.guard.ts
A	gateway/src/logger.middleware.ts
M	gateway/tsconfig.build.json
A	scripts/check-auth.mjs
A	scripts/check-clients.mjs
A	scripts/check-gateway.mjs
M	scripts/install-all.ps1
M	scripts/start-all.ps1
M	shared/database/README.md
D	shared/database/index.d.ts
D	shared/database/index.js
A	shared/database/package-lock.json
M	shared/database/package.json
A	shared/database/src/index.ts
A	shared/database/tsconfig.json
M	svc-auth/.env.example
A	svc-auth/README.md
M	svc-auth/package-lock.json
M	svc-auth/package.json
M	svc-auth/src/auth/auth.module.ts
M	svc-auth/src/auth/auth.service.ts
M	svc-auth/src/auth/dto/signIn.reponse.ts
M	svc-auth/src/auth/dto/signIn.request.ts
A	svc-auth/src/auth/jwt.config.ts
M	svc-auth/src/main.ts
M	svc-auth/tsconfig.build.json
M	svc-dangky/.env.example
A	svc-dangky/README.md
M	svc-dangky/package-lock.json
M	svc-dangky/package.json
M	svc-dangky/src/app.controller.ts
M	svc-dangky/src/app.module.ts
A	svc-dangky/src/clients/detai.client.ts
A	svc-dangky/src/clients/find-by-id.ts
A	svc-dangky/src/clients/sinhvien.client.ts
M	svc-dangky/src/main.ts
M	svc-dangky/tsconfig.build.json
M	svc-detai/.env.example
M	svc-detai/README.md
M	svc-detai/package-lock.json
M	svc-detai/package.json
M	svc-detai/src/app.controller.ts
M	svc-detai/src/main.ts
M	svc-detai/tsconfig.build.json
M	svc-sinhvien/.env.example
A	svc-sinhvien/README.md
M	svc-sinhvien/package-lock.json
M	svc-sinhvien/package.json
M	svc-sinhvien/src/app.controller.ts
M	svc-sinhvien/src/main.ts
M	svc-sinhvien/tsconfig.build.json
A	docs/BAO-CAO-NGHIEM-THU.md
A	scripts/check-swagger.mjs
A	scripts/fixtures/database-stub.mjs
```

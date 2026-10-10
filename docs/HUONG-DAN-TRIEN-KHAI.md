# Hướng dẫn clone và triển khai dự án trên máy mới

Tài liệu này hướng dẫn chạy bản demo trên máy Windows bằng PowerShell, SQL Server và Node.js. Sau khi hoàn thành, giao diện Angular chạy tại `http://localhost:4200`, gateway tại `http://localhost:3000`.

Clone repository chỉ tải mã nguồn. Người chạy cần tự tạo database và các file `.env` theo môi trường của mình. Các bước bên dưới phục vụ chạy thử/phát triển trên máy cá nhân; chưa phải quy trình triển khai production.

## 1. Chuẩn bị công cụ

| Công cụ | Mục đích |
| --- | --- |
| Git | Clone mã nguồn |
| Node.js 24 LTS và npm | Chạy backend NestJS và frontend Angular |
| SQL Server | Lưu dữ liệu; có thể dùng instance SQL Server Express đã cài |
| SQL Server Management Studio (SSMS) | Kết nối SQL Server và thực thi script tạo database |
| Microsoft ODBC Driver 17 for SQL Server | Driver kết nối database, phù hợp kiến trúc Node.js |
| PowerShell | Chạy các lệnh và script có sẵn trong repository |

Kiểm tra các công cụ trong PowerShell:

```powershell
git --version
node --version
npm.cmd --version
Get-OdbcDriver | Where-Object Name -Like '*SQL Server*'
```

Đảm bảo dịch vụ SQL Server đang chạy và bạn kết nối được bằng SSMS. Ghi lại tên máy chủ/instance và phương thức đăng nhập để cấu hình ở bước 3.

## 2. Clone mã nguồn

```powershell
git clone https://github.com/tuwns05/Demo_Nest_JS_SOA.git
cd Demo_Nest_JS_SOA
```

Các lệnh bên dưới chạy từ thư mục gốc `Demo_Nest_JS_SOA`, trừ khi có hướng dẫn chuyển thư mục.

## 3. Tạo và cấu hình môi trường

Chạy một lần trên bản clone mới:

```powershell
Copy-Item .env.example .env

foreach ($name in @('gateway','svc-auth','svc-sinhvien','svc-detai','svc-dangky')) {
  Copy-Item "$name/.env.example" "$name/.env"
}
```

Nếu đã có `.env` chứa cấu hình của bạn, chỉnh sửa file đó thay vì chạy lại lệnh sao chép và ghi đè.

### Cấu hình SQL Server và JWT dùng chung

Mở `.env` ở thư mục gốc. Ví dụ sau dành cho SQL Server Express có instance tên `SQLEXPRESS` trên cùng máy, dùng Windows Authentication:

```dotenv
DB_HOST=localhost
DB_PORT=
DB_NAME=SOA_AUTH
DB_INSTANCE=SQLEXPRESS
DB_ODBC_DRIVER=ODBC Driver 17 for SQL Server
DB_USER=
DB_PASSWORD=
DB_CONNECTION_STRING=
JWT_SECRET=
JWT_EXPIRES_IN=15m
```

- Thay `DB_HOST` và `DB_INSTANCE` theo SQL Server thực tế. Nếu dùng instance mặc định thì để trống `DB_INSTANCE`.
- Nếu kết nối qua cổng TCP, điền `DB_PORT` theo cổng SQL Server đang dùng và để trống `DB_INSTANCE`. Không điền cả hai cùng lúc.
- Để trống cả `DB_USER` và `DB_PASSWORD` để dùng Windows Authentication. Tài khoản Windows chạy backend cần quyền truy cập bốn database của dự án.
- Nếu dùng SQL Authentication, điền cả `DB_USER` và `DB_PASSWORD`, bảo đảm SQL Server cho phép phương thức xác thực này và tài khoản có quyền truy cập các database.
- Giữ `DB_CONNECTION_STRING` trống để ứng dụng tạo chuỗi kết nối từ các biến trên. Chuỗi ghi đè có database cố định sẽ làm mất tác dụng của `DB_NAME` riêng từng service.
- `DB_ODBC_DRIVER` phải trùng tên driver đã cài.

Tạo JWT secret ngẫu nhiên:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Sao chép kết quả vào `JWT_SECRET` trong `.env` gốc. Secret cần ít nhất 32 ký tự và được các service dùng chung. Không commit `.env` hoặc chia sẻ secret thật.

### Cấu hình riêng từng service

Các file `.env.example` đã có cổng và tên database phù hợp. Giữ nguyên cho lần chạy đầu tiên:

| Thư mục | Cổng | Database |
| --- | --- | --- |
| `gateway` | 3000 | Không kết nối database |
| `svc-auth` | 3004 | `SOA_AUTH` |
| `svc-sinhvien` | 3001 | `SOA_SINHVIEN` |
| `svc-detai` | 3002 | `SOA_DETAI` |
| `svc-dangky` | 3003 | `SOA_DANGKY` |

Service đọc `.env` trong thư mục riêng trước, rồi lấy các cấu hình còn thiếu từ `.env` gốc. Vì vậy `DB_NAME` của từng service ghi đè giá trị ở file gốc.

## 4. Tạo database và tài khoản demo

Mở SSMS và kết nối đúng SQL Server đã khai báo trong `.env`. Tài khoản chạy script cần quyền tạo database và bảng.

Mở và chạy **toàn bộ** từng file theo thứ tự:

1. [01-auth.sql](../db/separate/01-auth.sql): tạo `SOA_AUTH` và bảng `dbo.User`.
2. [02-sinhvien.sql](../db/separate/02-sinhvien.sql): tạo `SOA_SINHVIEN` và bảng `dbo.SINHVIEN`.
3. [03-detai.sql](../db/separate/03-detai.sql): tạo `SOA_DETAI` và bảng `dbo.DETAI`.
4. [04-dangky.sql](../db/separate/04-dangky.sql): tạo `SOA_DANGKY` và bảng `dbo.DANGKY`.

Các file tự chọn database cần thiết bằng `USE`. Script giữ lại database/bảng đã tồn tại, không tự sửa cấu trúc bảng cũ và không sao chép dữ liệu từ máy khác.

Sau đó mở [db/seed.sql](../db/seed.sql), **chọn database `SOA_AUTH` trên thanh công cụ SSMS** rồi Execute. File seed không tự chọn database.

Tài khoản demo được tạo nếu chưa tồn tại:

```text
Tên đăng nhập: demo
Mật khẩu:      Demo@123456
```

Seed lưu mật khẩu dưới dạng bcrypt hash và không ghi đè tài khoản `demo` đã có. Các bảng sinh viên, đề tài và đăng ký ban đầu trống; có thể thêm dữ liệu qua giao diện sau khi đăng nhập.

## 5. Cài dependencies và chạy backend

Tại thư mục gốc:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/install-all.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-all.ps1
```

Script cài đặt xử lý package `shared/database` trước các service; package này được build qua npm `prepare`. Script chưa cài dependencies frontend.

Script khởi động chạy năm tiến trình backend trong các cửa sổ PowerShell ẩn. Chờ các service biên dịch và kết nối database, rồi kiểm tra:

```powershell
Invoke-RestMethod http://localhost:3000/health
```

Nếu không kết nối được hoặc health báo service lỗi, dùng cách chạy riêng bên dưới để đọc log trực tiếp. Không chạy lại script khởi động khi các tiến trình cũ vẫn chiếm cổng.

### Chạy riêng để xem log và dừng dễ dàng

Thay cho `start-all.ps1`, mở năm terminal PowerShell, chuyển vào từng thư mục `svc-auth`, `svc-sinhvien`, `svc-detai`, `svc-dangky`, `gateway` rồi chạy:

```powershell
npm.cmd run start:dev
```

Ví dụ trong một terminal từ thư mục gốc:

```powershell
cd svc-auth
npm.cmd run start:dev
```

Nhấn `Ctrl+C` trong từng terminal để dừng tiến trình tương ứng. Nếu đã chạy bằng script ẩn, dùng Task Manager xác định các tiến trình của dự án theo dòng lệnh trước khi dừng; tránh dừng toàn bộ tiến trình Node.js của ứng dụng khác.

## 6. Cài và chạy frontend

Mở terminal mới tại thư mục gốc:

```powershell
cd FE_Demo_SOA_AG
npm.cmd ci
npm.cmd start
```

Giữ terminal này chạy và mở `http://localhost:4200`. Đăng nhập bằng tài khoản demo đã tạo ở bước 4.

Frontend đã cấu hình proxy phát triển để chuyển `/api/*` đến gateway cổng 3000. Với cấu hình mặc định, không cần sửa URL backend trong frontend.

## 7. Kiểm tra sau khi chạy

1. Gọi `http://localhost:3000/health` và xác nhận các service hoạt động.
2. Mở `http://localhost:4200` và đăng nhập thành công.
3. Tạo một sinh viên và một đề tài.
4. Tạo đăng ký bằng cách chọn sinh viên và đề tài vừa tạo, rồi tải lại danh sách để kiểm tra dữ liệu đã lưu.

Có thể thử API theo [api-test.http](api-test.http). Swagger của từng service nằm tại `/api` trên cổng 3001–3004, ví dụ `http://localhost:3004/api`.

## 8. Lỗi thường gặp

| Hiện tượng | Cách xử lý |
| --- | --- |
| Không clone được repository | Kiểm tra URL, kết nối mạng và quyền GitHub nếu repository riêng tư |
| PowerShell chặn script hoặc `npm.ps1` | Dùng lệnh `powershell -NoProfile -ExecutionPolicy Bypass -File ...` như trên và gọi `npm.cmd` |
| Thiếu biến môi trường | Kiểm tra đã tạo `.env` gốc và `.env` của cả năm thành phần; điền `DB_HOST` và `JWT_SECRET` |
| Thiếu ODBC driver | Kiểm tra bằng `Get-OdbcDriver`, cài driver phù hợp kiến trúc Node.js và sửa `DB_ODBC_DRIVER` theo đúng tên |
| Không kết nối SQL Server | Kiểm tra dịch vụ SQL Server, host/instance/cổng, TCP/IP, firewall và quyền tài khoản trên bốn database |
| Lỗi quyền tạo database | Chạy script bằng tài khoản có quyền tạo database/bảng hoặc nhờ quản trị viên tạo trước |
| `EADDRINUSE` | Có tiến trình đang chiếm cổng; dừng đúng tiến trình cũ trước khi chạy lại |
| Health báo lỗi/503 | Chạy service bị lỗi trong terminal riêng, kiểm tra log và kết nối database |
| Đăng nhập trả 401 | Kiểm tra đã seed vào `SOA_AUTH`, nhập đúng tài khoản và mật khẩu; seed không đổi mật khẩu của user đã tồn tại |
| API trả 401 sau khi đổi secret | Bảo đảm các thành phần dùng cùng `JWT_SECRET`, khởi động lại backend và đăng nhập lại |
| Giao diện mở được nhưng không gọi API | Kiểm tra gateway cổng 3000 đang chạy và frontend được chạy bằng `npm.cmd start` với proxy hiện có |

Nếu phải đổi cổng, cập nhật `PORT` của service và các URL trỏ tới service đó trong `.env`. Nếu đổi cổng gateway, cập nhật thêm `FE_Demo_SOA_AG/proxy.conf.json`, rồi khởi động lại các thành phần liên quan.

## 9. Chạy lại vào những lần sau

Sau khi đã tạo database, cấu hình và cài dependencies, chỉ cần chạy lại backend và frontend theo bước 5–6. Không cần sao chép lại `.env` hoặc tạo lại database mỗi lần.

Sau khi nhận thay đổi mã nguồn, kiểm tra hướng dẫn cập nhật database nếu có và cài lại dependencies khi package/lockfile thay đổi.

Các tài liệu liên quan: [README dự án](../README.md), [database riêng từng service](../db/separate/README.md), [frontend](../FE_Demo_SOA_AG/README.md).

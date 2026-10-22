# Kiểm thử và demo Redis

## Phân biệt các mức kiểm chứng

- `shared/cache/test/cache.spec.ts`: thuật toán cache/lock với FakeRedis, 100 CacheService độc lập dùng chung một kho giả lập. Loader được đếm bằng spy; không chạy SQL hoặc Lua thật.
- `shared/cache/test/redis.integration.spec.ts`: Redis thật, Lua thật, hai client, 100 request; SQL vẫn là callback giả lập. Chỉ bật khi có `REDIS_TEST_URL`, dùng prefix UUID riêng và xóa đúng key đã tạo.
- Test service: SQL và cache giả lập kiểm tra CRUD gọi invalidate đúng thời điểm, hit không gọi query, delete giữ 404, create làm mới list và sinh viên vẫn gọi Auth với JWT.
- E2E HTTP hiện có: Nest/Supertest với database, cache và business service override; kiểm tra route, DTO, authorization/role/401/403, không phải toàn hệ thống Redis + SQL.
- Load test k6: hệ thống thật với JWT, Redis, SQL đang chạy; cần đo thêm SELECT, không suy ra số query từ RPS.

## Chạy kiểm thử tự động

Tại gốc repo:

```powershell
npm.cmd ci --prefix shared/cache
npm.cmd ci --prefix svc-sinhvien
npm.cmd ci --prefix svc-detai
npm.cmd run build --prefix shared/cache
npm.cmd run lint --prefix shared/cache
npm.cmd test --prefix shared/cache
npm.cmd run build --prefix svc-sinhvien
npm.cmd run lint --prefix svc-sinhvien
npm.cmd test --prefix svc-sinhvien
npm.cmd run test:e2e --prefix svc-sinhvien
npm.cmd run build --prefix svc-detai
npm.cmd run lint --prefix svc-detai
npm.cmd test --prefix svc-detai
npm.cmd run test:e2e --prefix svc-detai
```

Chạy Redis thật sau khi cài và cấu hình Redis trong WSL/Ubuntu theo [hướng dẫn Redis](redis-cache.md). Các lệnh dưới chạy trong PowerShell:

```powershell
wsl -d Ubuntu sudo service redis-server start
wsl -d Ubuntu redis-cli PING
$env:REDIS_TEST_URL = 'redis://127.0.0.1:6379'
npm.cmd test --prefix shared/cache
Remove-Item Env:REDIS_TEST_URL
```

Nếu không đặt REDIS_TEST_URL, integration test **skip**, không được xem là đã kiểm chứng Redis thật. Không chạy integration test vào Redis production.

## Key, TTL và hit/miss

```powershell
wsl -d Ubuntu redis-cli --scan --pattern 'soa:*'
wsl -d Ubuntu redis-cli GET soa:detai:detail:1
wsl -d Ubuntu redis-cli TTL soa:detai:detail:1
wsl -d Ubuntu redis-cli PTTL soa:detai:detail:1:lock
```

TTL -2: không có key; TTL -1: key không hết hạn. Lock thường được giải phóng quá nhanh để quan sát bằng tay; dùng log LOCK_ACQUIRED/LOCK_WAIT và bộ test slow-loader thay vì giả định lock không tồn tại.

Dùng ID thật trong database demo. Đăng nhập admin theo [API.md](API.md), rồi:

```powershell
$env:DEMO_TOKEN = Read-Host 'JWT admin'
wsl -d Ubuntu redis-cli DEL soa:detai:detail:1
curl.exe -H "Authorization: Bearer $env:DEMO_TOKEN" http://localhost:3000/detai/1
curl.exe -H "Authorization: Bearer $env:DEMO_TOKEN" http://localhost:3000/detai/1
```

DEL trên chỉ phục vụ demo key cụ thể, không xóa lock/generation khi có request chạy. Lần đầu thấy MISS/ACQUIRED/LOAD; lần sau HIT. Response phải cùng cấu trúc. Chờ hơn 65 giây rồi đọc lại để chứng minh hết hạn (có thể giảm TTL trong .env demo rồi restart service).

## Kiểm thử CRUD và invalidation

Chọn đề tài demo riêng để không sửa dữ liệu quan trọng. Trong Postman gửi PATCH `/detai/1`, Bearer admin, body JSON `{"tenDT":"Demo Redis cập nhật"}`. Hoặc dùng PowerShell:

```powershell
$headers = @{ Authorization = "Bearer $env:DEMO_TOKEN" }
Invoke-RestMethod -Method Patch -Uri http://localhost:3000/detai/1 -Headers $headers -ContentType 'application/json' -Body '{"tenDT":"Demo Redis update"}'
wsl -d Ubuntu redis-cli GET soa:detai:generation
curl.exe -H "Authorization: Bearer $env:DEMO_TOKEN" http://localhost:3000/detai/1
```

Sau PATCH, log CACHE_INVALIDATED; GET kế tiếp trả tên mới và tải SQL một lần. Làm ấm GET `/detai`, POST đề tài mới, GET list để thấy bản ghi mới. DELETE chỉ bản ghi demo vừa tạo, GET ID đó phải 404, không trả bản sao cũ. Lặp lại với `/sinhvien/SV...`; POST sinh viên cần admin và Auth đang chạy, dùng mã mới chưa có tài khoản. SQL lỗi hoặc bản ghi không tồn tại không được invalidate; unit test kiểm tra điều này.

## Concurrent load test bằng k6

Cài k6 theo môi trường máy. File `scripts/redis-load.js` gửi 100 virtual users, mỗi user một GET cùng key. Không chứa token cố định. Tại gốc:

```powershell
$env:DEMO_URL = 'http://localhost:3000/detai/1'
wsl -d Ubuntu redis-cli DEL soa:detai:detail:1
k6 run scripts/redis-load.js
```

Trước khi DEL phải dừng các lượt tải trước. Kỳ vọng một CACHE_LOAD cho key lạnh nếu SQL hoàn tất trong lease, không có writer và Redis bình thường. Có thể ít LOCK_WAIT nếu SQL quá nhanh và request đến sau đã hit; không được kết luận lock hỏng. Để demo cạnh tranh rõ ràng, dùng test 100 instance có loader chậm 30 ms hoặc slow-loader test gia hạn 800 ms; không chèn WAITFOR vào SQL production.

Để kiểm tra nhiều process thật, chạy thêm instance svc-detai với PORT khác nhưng cùng DB/REDIS_URL/prefix, dùng công cụ tải gửi cùng ID tới cả hai cổng hoặc đặt reverse proxy phân phối. Bộ integration Redis đã dùng hai client độc lập, nhưng không thay thế phép đo nhiều Nest process thật.

## Đếm SQL thật và so sánh trước/sau

Log `CACHE_LOAD detai:detail` là số lần gọi callback đọc trong gói cache. Thu log của **tất cả instance** trong đúng cửa sổ test. Đếm theo scope/kind; thử một key duy nhất, tắt lưu lượng nền để tránh nhập nhằng. Log không chứa SQL hoặc ID nhạy cảm.

Để kiểm chứng SQL thực sự chạy, dùng SQL Server Extended Events hoặc SQL Profiler trên database SOA_DETAI, lọc SELECT vào dbo.DETAI trong khoảng bắt đầu/kết thúc test. Theo dõi cả batch và RPC tùy driver; không đếm trùng sự kiện hoàn tất statement và batch. Loại SELECT 1 của health và các câu ghi. Đối chiếu số statement với CACHE_LOAD, status HTTP và thời gian k6. Quyền tạo/đọc session đo SQL phải do môi trường cấp.

Muốn tái hiện stampede **không lock**, chạy bản trước thay đổi trong checkout và cổng demo riêng, cùng dữ liệu, cùng k6, cùng điều kiện cache lạnh. Bản trước chưa cache có thể gọi SQL cho mọi GET. Không tắt guard hoặc sửa khóa trên hệ thống đang dùng. Giải pháp hiện tại không có cờ bypass cache vì bypass hàng loạt chính là rủi ro cần tránh.

| Phép đo hệ thống thật | Trước nâng cấp | Sau nâng cấp |
| --- | --- | --- |
| Số GET | Chưa đo | Chưa đo |
| Số SELECT nghiệp vụ | Chưa đo | Chưa đo |
| HTTP 200 / 503 | Chưa đo | Chưa đo |
| p50 / p95 / p99 | Chưa đo | Chưa đo |
| Thời gian và cấu hình máy | Chưa đo | Chưa đo |

Không điền số liệu kỳ vọng vào bảng kết quả thực tế. Unit test đã đếm callback, không phải phép đo SQL Server.

## Redis unavailable và khôi phục

```powershell
wsl -d Ubuntu sudo service redis-server stop
curl.exe -i -H "Authorization: Bearer $env:DEMO_TOKEN" http://localhost:3000/detai/1
wsl -d Ubuntu sudo service redis-server start
wsl -d Ubuntu redis-cli PING
```

GET khi Redis dừng phải 503, không có CACHE_LOAD mới cho request đó. Sau reconnect, GET hoạt động lại và nạp cache nếu cần. POST/PATCH/DELETE vẫn theo SQL; lỗi invalidate chỉ log, cache cũ có thể tồn tại nếu Redis giữ dữ liệu qua sự cố. Cấu hình Redis demo trong hướng dẫn tắt persistence, restart mất cache/lock. Không coi bài test restart sạch là chứng minh đã giải quyết mọi stale cache khi mạng chập chờn. Chỉ dừng Redis demo riêng của dự án, không dừng Redis dùng chung của hệ thống khác.

## Kịch bản thuyết trình 5–7 phút

1. Mở sơ đồ trong redis-cache.md, chỉ rõ SQL là nguồn chính, Redis nằm sau guard ở hai service.
2. PING Redis, GET đề tài có JWT lần đầu sau DEL đúng key; trình bày MISS → LOCK_ACQUIRED → CACHE_LOAD; xem TTL.
3. GET lần hai; chỉ ra CACHE_HIT và không tăng CACHE_LOAD.
4. PATCH tên đề tài demo; chỉ ra CACHE_INVALIDATED, generation tăng, GET trả tên mới. Thêm rồi xóa một đề tài demo và kiểm tra list/404.
5. DEL key dữ liệu rồi chạy k6 100 request; đối chiếu số CACHE_LOAD và SELECT trong công cụ SQL. Nếu chưa có môi trường, chạy unit test 100 instance và nói rõ đây là giả lập.
6. Chạy ca race và mất token trong shared/cache/test/cache.spec.ts; mở Lua PUBLISH/RELEASE để giải thích vì sao holder cũ không ghi/xóa sai.
7. Dừng Redis và GET để thấy 503 có kiểm soát, khởi động lại. Nêu giới hạn SQL commit/invalidation và lease khi process bị treo.

## Kết quả thực hiện trong phiên triển khai

Đã chạy ngày 22/10/2026, Node.js v24.15.0:

| Thành phần | Build | Lint | Unit/mocked test | HTTP E2E |
| --- | --- | --- | --- | --- |
| `shared/cache` | Đạt | Đạt | 11 đạt, 1 integration bỏ qua | Không áp dụng |
| `svc-sinhvien` | Đạt | Đạt | 5 đạt | 28 đạt |
| `svc-detai` | Đạt | Đạt | 8 đạt | 23 đạt |

Tổng cộng **75 test đạt**, một test Redis thật bị bỏ qua vì chưa đặt REDIS_TEST_URL và không có Redis tại 127.0.0.1:6379. Trong ca đồng thời giả lập, 100 CacheService đọc cùng key có đúng **1 lần gọi loader**. Không chuyển số này thành tuyên bố đã đo một SELECT trên SQL Server thật.

Các lệnh build/lint/test trong mục trên đã thực sự chạy (cài dependency bằng `npm.cmd install`, cập nhật lockfile). Test service lần đầu bị EPERM khi Vite ghi `.vite-temp`; chạy lại với quyền phù hợp đã đạt. Sau rà soát đã chạy lại build/lint cả ba gói và unit test. Vitest còn thông báo plugin `vite-tsconfig-paths` có thể được thay bằng tùy chọn native của Vite; đây không phải lỗi test và chưa thay cấu hình ngoài phạm vi.

Trong phiên kiểm thử, kiểm tra TCP Redis tại 127.0.0.1:6379 thất bại. **Chưa chạy** Lua trên Redis thật, integration Redis + SQL Server, k6 qua gateway, đo SQL Extended Events, hay tải nhiều Nest process thật. Tài liệu hiện hướng dẫn Redis trực tiếp qua WSL hoặc Redis có sẵn; chưa cài WSL/Redis hoặc thay đổi dịch vụ trên máy người dùng. Các hướng dẫn và bảng chưa đo phía trên dành cho bước xác minh trong môi trường đang chạy. Không có kết quả benchmark thực tế được suy diễn.

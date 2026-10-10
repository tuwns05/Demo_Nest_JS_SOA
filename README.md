# Hệ thống quản lý đồ án tốt nghiệp theo SOA

Dự án mô phỏng hệ thống giúp khoa quản lý sinh viên, đề tài và việc đăng ký đồ án tốt nghiệp. Hệ thống được xây dựng bằng NestJS theo **kiến trúc hướng dịch vụ (Service-Oriented Architecture — SOA)**, với giao diện Angular và cơ sở dữ liệu SQL Server.

Mục tiêu của demo là thể hiện cách chia bài toán thành các dịch vụ có trách nhiệm riêng, giao tiếp qua HTTP/REST và phối hợp để thực hiện nghiệp vụ. Hệ thống cung cấp các chức năng CRUD cơ bản trên ba nhóm dữ liệu: **SINHVIEN, DETAI và DANGKY**.

## Tổ chức hệ thống theo SOA

Trong hệ thống này, mỗi dịch vụ phụ trách một phần nghiệp vụ và cung cấp API để các thành phần khác sử dụng. Các dịch vụ chạy trong tiến trình riêng, có cấu hình và cổng HTTP riêng, nên có thể được khởi động hoặc dừng độc lập.

| Thành phần | Vai trò |
| --- | --- |
| `svc-sinhvien` | Quản lý thông tin sinh viên và cung cấp API tra cứu sinh viên |
| `svc-detai` | Quản lý đề tài và cung cấp API tra cứu đề tài |
| `svc-dangky` | Quản lý đăng ký đồ án, phối hợp với dịch vụ sinh viên và đề tài |
| `svc-auth` | Xác thực tài khoản và cấp JWT để truy cập API |
| `gateway` | Tiếp nhận yêu cầu, kiểm tra xác thực và chuyển tiếp đến dịch vụ phù hợp |
| `FE_Demo_SOA_AG` | Giao diện đăng nhập và thao tác với các chức năng quản lý |

Ba dịch vụ sinh viên, đề tài và đăng ký là phần nghiệp vụ chính. Gateway và dịch vụ xác thực hỗ trợ truy cập hệ thống.

## Những đặc trưng SOA được thể hiện

**Dịch vụ có trách nhiệm riêng:** chức năng quản lý sinh viên, đề tài và đăng ký được tách thành các dịch vụ riêng. Mỗi dịch vụ xử lý nghiệp vụ và truy cập database thuộc phạm vi của mình.

**Giao tiếp qua giao thức chuẩn:** các dịch vụ cung cấp API HTTP/REST và trao đổi dữ liệu JSON. Các thao tác sử dụng GET để đọc, POST để tạo, PATCH để cập nhật và DELETE để xóa.

**Phối hợp giữa các dịch vụ:** dịch vụ đăng ký gọi API sinh viên và đề tài để kiểm tra dữ liệu trước khi tạo hoặc cập nhật đăng ký. Việc tra cứu thực hiện qua HTTP thay vì đọc trực tiếp database của dịch vụ khác.

**Khả năng tái sử dụng:** API sinh viên và đề tài được sử dụng bởi cả giao diện quản lý và dịch vụ đăng ký. Những ứng dụng khác cũng có thể sử dụng các API này khi tuân thủ hợp đồng và yêu cầu xác thực.

## Chức năng chính

- **Quản lý sinh viên:** thêm, xem danh sách và chi tiết, cập nhật, xóa sinh viên.
- **Quản lý đề tài:** thêm, xem danh sách và chi tiết, cập nhật, xóa đề tài.
- **Quản lý đăng ký:** đăng ký đề tài cho sinh viên, xem, cập nhật và xóa đăng ký.
- **Đăng nhập:** xác thực tài khoản và cấp JWT để sử dụng các API được bảo vệ.
- **Kiểm tra trạng thái:** theo dõi tình trạng hoạt động của các dịch vụ qua health check.

## Ví dụ phối hợp dịch vụ

Khi người dùng đăng ký đề tài cho một sinh viên:

1. Giao diện gửi yêu cầu đến gateway.
2. Gateway kiểm tra JWT và chuyển yêu cầu đến dịch vụ đăng ký.
3. Dịch vụ đăng ký gọi API sinh viên để kiểm tra mã sinh viên.
4. Dịch vụ đăng ký gọi API đề tài để kiểm tra mã đề tài.
5. Khi các kiểm tra thành công, dịch vụ đăng ký lưu dữ liệu vào database của mình và trả kết quả.

Luồng này minh họa việc kết hợp các dịch vụ để hoàn thành một nghiệp vụ chung. Dịch vụ sinh viên và đề tài tiếp tục cung cấp chức năng quản lý riêng, đồng thời phục vụ nhu cầu tra cứu của dịch vụ đăng ký.

## Dữ liệu và công nghệ

Hệ thống sử dụng **NestJS** cho backend, **Angular** cho frontend và **SQL Server** để lưu dữ liệu. Các dịch vụ giao tiếp qua HTTP/REST; JWT được dùng để xác thực yêu cầu.

Ba bảng nghiệp vụ được tổ chức trong các database `SOA_SINHVIEN`, `SOA_DETAI` và `SOA_DANGKY`. Tài khoản đăng nhập nằm trong `SOA_AUTH`. Các database hiện dùng chung một SQL Server instance.

Đây là bản demo phục vụ bài thực hành. Các dịch vụ đã được tách tiến trình và API, nhưng vẫn dùng chung hạ tầng SQL Server và một số cấu hình. Kiểm tra tham chiếu khi tạo/sửa đăng ký đã có; việc bảo đảm toàn vẹn dữ liệu khi xóa hoặc thao tác đồng thời chưa hoàn thiện.

## Chạy và tìm hiểu dự án

Xem [Hướng dẫn triển khai](docs/HUONG-DAN-TRIEN-KHAI.md) để clone mã nguồn, cấu hình môi trường, tạo database và chạy backend/frontend trên máy mới.

Sau khi khởi động, giao diện nằm tại `http://localhost:4200` và gateway tại `http://localhost:3000`.

Thông tin chi tiết về endpoint và dữ liệu nằm trong [Tài liệu API](docs/API.md). Có thể thử các yêu cầu bằng [api-test.http](docs/api-test.http).

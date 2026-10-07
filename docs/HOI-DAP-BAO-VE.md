# Hỏi đáp bảo vệ demo

1. **SOA là gì?** Chia hệ thống thành dịch vụ có trách nhiệm và hợp đồng giao tiếp rõ ràng.
2. **Bằng chứng dịch vụ riêng?** Package, bootstrap, cổng và controller riêng.
3. **Microservices hoàn chỉnh chưa?** Chưa; còn dùng chung DB và vận hành.
4. **Gateway làm gì?** Xác thực, định tuyến, lọc header và tổng hợp health.
5. **Có phải ESB?** Chưa có chuyển đổi đa giao thức hay điều phối nghiệp vụ kiểu ESB.
6. **Tại sao HTTP?** Dễ quan sát, thử nghiệm; chưa dùng message broker.
7. **Ai sở hữu bảng?** Auth sở hữu User; bảng nghiệp vụ khác mới là thiết kế dự kiến.
8. **SQL đã cưỡng chế quyền sở hữu chưa?** Chưa; đó là quy ước kiến trúc.
9. **Shared chứa nghiệp vụ không?** Không; chỉ pool và truy vấn tham số.
10. **Lưu mật khẩu thế nào?** Bcrypt hash, kiểm tra bằng bcrypt.compare.
11. **JWT kiểm tra ở đâu?** Gateway và guard của auth.
12. **JWT có mã hóa payload không?** Không; token được ký, payload đọc được.
13. **Có phân quyền vai trò chưa?** Chưa; xác thực không tự tạo quyền nghiệp vụ.
14. **Giả x-user-id được không?** Gateway ghi đè bằng sub; truy cập trực tiếp service cần hạn chế tại tầng triển khai.
15. **Service chết thì sao?** Route của nó 503, health degraded, service khác tiếp tục chạy.
16. **DB chết thì sao?** Có thể ảnh hưởng tất cả vì dùng chung SQL Server.
17. **Health kiểm tra gì?** Service SELECT 1; gateway kiểm tra song song, timeout 2 giây.
18. **Có CRUD chưa?** Chưa; chỉ nền tảng, auth và health.
19. **Tạo đăng ký được chưa?** Chưa; mới có client HTTP, endpoint tra cứu cũng chưa có.
20. **Giao dịch phân tán?** Chưa; cần thiết kế saga hoặc bù khi thêm nghiệp vụ.
21. **Chống SQL injection?** Dùng tham số, không nối chuỗi đầu vào vào SQL.
22. **Có retry/circuit breaker?** Chưa; chỉ timeout và ánh xạ lỗi sang 503.
23. **Swagger bảo mật API không?** Không; guard mới kiểm tra token.
24. **Sẵn sàng production chưa?** Chưa; cần TLS, quản lý secret, phân quyền, giám sát và kiểm thử tải.
25. **Không SQL Server kiểm tra được gì?** Build, gateway giả lập, client và auth với dữ liệu giả; chưa chứng minh ODBC và truy vấn thật.

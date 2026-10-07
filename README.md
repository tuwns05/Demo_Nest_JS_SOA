# Demo NestJS SOA

D? án mô ph?ng ki?n trúc hu?ng d?ch v? (SOA) cho h? th?ng qu?n lý d? án t?t nghi?p. M?i service d?c l?p, ch? giao ti?p qua HTTP/REST và chia s? h? t?ng thông qua `shared/database`.

## C?u trúc thu m?c

- `gateway/`: c?ng vào duy nh?t, th?c hi?n route forwarding và t?ng h?p health check
- `svc-auth/`: xác th?c ngu?i dùng và phát hành JWT
- `svc-sinhvien/`: service s? h?u b?ng `SINHVIEN`
- `svc-detai/`: service s? h?u b?ng `DETAI`
- `svc-dangky/`: service s? h?u b?ng `DANGKY`, giao ti?p HTTP v?i service khác
- `shared/database/`: module k?t n?i SQL Server dùng chung cho m?i service
- `docs/`: tài li?u hu?ng d?n và ví d? request
- `scripts/`: script cài d?t và kh?i d?ng d?ng b?

## Yêu c?u môi tru?ng

- Node.js 20+
- NestJS 12
- SQL Server v?i ODBC Driver 17
- Windows Authentication ho?c SQL Authentication
- `npm.cmd` trên Windows PowerShell

## Bi?n môi tru?ng

Sao chép `.env.example` ? g?c và c?p nh?t giá tr? th?c c?a máy b?n. N?u thi?u bi?n b?t bu?c, ?ng d?ng s? d?ng ngay khi kh?i d?ng v?i thông báo rõ ràng.

## Ch?y nhanh

```powershell
# Cài d?t t?t c? service
./scripts/install-all.ps1

# Kh?i d?ng t?t c? service
./scripts/start-all.ps1
```

Ho?c ch?y t?ng service bên trong thu m?c tuong ?ng:

```powershell
cd svc-auth
npm.cmd install
npm.cmd run start:dev
```

## Route quan tr?ng

- `GET /health`: gateway t?ng h?p tr?ng thái c?a t?ng service
- `GET /sinhvien/health`: health check service sinh viên
- `GET /detai/health`: health check service d? tài
- `GET /dangky/health`: health check service dang ký
- `GET /auth/health`: health check service xác th?c

## Biên b?n hi?n t?i

D? án ? giai do?n n?n t?ng SOA: c?u hình môi tru?ng, k?t n?i co s? d? li?u, health check, JWT, gateway và hu?ng d?n ch?y chu?n. Các CRUD nghi?p v? và logic b?ng nghi?p v? s? do ngu?i dùng t? hoàn thi?n sau này.

## Quy t?c áp d?ng

- M?i service ch? truy v?n b?ng c?a chính nó.
- `svc-dangky` không truy v?n tr?c ti?p b?ng `SINHVIEN`/`DETAI`; ph?i dùng HTTP/REST.
- Không d? hard-code tên database trong code.
- Tránh vi?t `SELECT/INSERT/UPDATE/DELETE` nghi?p v? trong n?n t?ng này.

## Danh sách vi?c tôi s? t? làm

- CRUD cho `SINHVIEN`, `DETAI`, `DANGKY`
- G?n d? li?u th?c t? t? database vào controller/service khi dã có yêu c?u nghi?p v? c? th?
- T?o logic nghi?p v? c?a t?ng service theo business flow riêng

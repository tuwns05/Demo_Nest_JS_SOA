# Hu?ng d?n h?c SOA

## M?c tiêu

D? án này mô ph?ng lu?ng request t? gateway d?n service và cu?i cùng d?n database. M?t request di qua gateway, du?c route t?i service thu?c tính, service ki?m tra d? li?u và tr? v? response chu?n.

## Lu?ng 1 request

1. Client g?i `GET /health` ho?c `POST /auth/login` qua gateway.
2. Gateway quy?t d?nh destination b?ng path và forward request t?i service tuong ?ng.
3. Service th?c thi logic h? t?ng (health check, JWT, k?t n?i database).
4. Database tr? k?t qu? và service convert thành response chu?n.

## M?o d?c code

- B?t d?u t? `gateway/src/main.ts` d? th?y cách kh?i d?ng gateway.
- Sau dó d?c `svc-auth/src/main.ts` và `svc-auth/src/auth/auth.module.ts` d? th?y JWT.
- Cu?i cùng d?c `shared/database/index.js` d? hi?u cách k?t n?i SQL Server.

# Ki?n trúc SOA

```text
Client -> Gateway -> service -> database
   \-> health check
```

## M?i service d?c l?p

- `svc-auth`: JWT và xác th?c
- `svc-sinhvien`: d? li?u sinh viên
- `svc-detai`: d? li?u d? tài
- `svc-dangky`: di?u ph?i gi?a các service

## Middleware và guard

- Gateway dóng vai trò entry point.
- Service gi? logic và health check riêng.
- `shared/database` d? qu?n lý k?t n?i và query.

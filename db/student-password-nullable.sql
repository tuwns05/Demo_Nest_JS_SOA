-- Chỉ cần cho bảng cũ có MatKhau NOT NULL. Không xóa dữ liệu cũ.
USE [SOA_SINHVIEN];
GO
IF DB_NAME() <> N'SOA_SINHVIEN'
    THROW 50001, N'Chưa chọn đúng database SOA_SINHVIEN.', 1;
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.SINHVIEN')
           AND name = N'MatKhau' AND is_nullable = 0)
    ALTER TABLE dbo.SINHVIEN ALTER COLUMN MatKhau NVARCHAR(255) NULL;
GO

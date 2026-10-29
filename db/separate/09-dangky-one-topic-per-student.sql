-- Resolve existing duplicate registrations before applying this migration.
USE [SOA_DANGKY];
GO
IF DB_NAME() <> N'SOA_DANGKY'
    THROW 50001, N'Chưa chọn đúng database SOA_DANGKY.', 1;

IF EXISTS (SELECT MaSV FROM dbo.DANGKY GROUP BY MaSV HAVING COUNT(*) > 1)
    THROW 50003, N'Có sinh viên đang có nhiều đăng ký. Xử lý dữ liệu trùng trước khi thêm UNIQUE(MaSV).', 1;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.DANGKY') AND name = N'UQ_DANGKY_MaSV'
)
    ALTER TABLE dbo.DANGKY ADD CONSTRAINT UQ_DANGKY_MaSV UNIQUE (MaSV);
GO

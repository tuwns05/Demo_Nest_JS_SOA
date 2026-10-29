-- Run after 04-dangky.sql on an existing SOA_DANGKY database.
-- Existing duplicate registrations need a business decision; never delete them automatically.
USE [SOA_DANGKY];
GO
IF DB_NAME() <> N'SOA_DANGKY'
    THROW 50001, N'Chưa chọn đúng database SOA_DANGKY.', 1;

IF EXISTS (
    SELECT MaDT FROM dbo.DANGKY GROUP BY MaDT HAVING COUNT(*) > 1
)
    THROW 50002, N'Có đề tài đã được nhiều sinh viên đăng ký. Xử lý dữ liệu trùng trước khi thêm UNIQUE(MaDT).', 1;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.DANGKY') AND name = N'UQ_DANGKY_MaDT'
)
    ALTER TABLE dbo.DANGKY ADD CONSTRAINT UQ_DANGKY_MaDT UNIQUE (MaDT);
GO

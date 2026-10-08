-- Chạy cả file bằng SSMS hoặc sqlcmd, không đặt trong transaction bao ngoài.
-- Có thể chạy lại: không xóa dữ liệu và không sửa cấu trúc bảng đã tồn tại.
USE [master];
GO
IF DB_ID(N'SOA_SINHVIEN') IS NULL
    EXEC(N'CREATE DATABASE [SOA_SINHVIEN]');
GO

USE [SOA_SINHVIEN];
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET XACT_ABORT ON;

-- Dừng nếu lệnh USE không thành công, tránh tạo bảng nhầm database.
IF DB_NAME() <> N'SOA_SINHVIEN'
    THROW 50001, N'Chưa chọn đúng database SOA_SINHVIEN.', 1;

IF OBJECT_ID(N'dbo.SINHVIEN', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SINHVIEN (
        MaSV VARCHAR(20) NOT NULL
            CONSTRAINT PK_SINHVIEN PRIMARY KEY,
        HoTen NVARCHAR(100) NOT NULL,
        Email VARCHAR(100) NULL,
        Lop NVARCHAR(50) NULL,
        MatKhau VARCHAR(255) NULL
    );
END;
GO

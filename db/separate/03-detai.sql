-- Chạy cả file bằng SSMS hoặc sqlcmd, không đặt trong transaction bao ngoài.
-- Có thể chạy lại: không xóa dữ liệu và không sửa cấu trúc bảng đã tồn tại.
USE [master];
GO
IF DB_ID(N'SOA_DETAI') IS NULL
    EXEC(N'CREATE DATABASE [SOA_DETAI]');
GO

USE [SOA_DETAI];
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET XACT_ABORT ON;

-- Dừng nếu lệnh USE không thành công, tránh tạo bảng nhầm database.
IF DB_NAME() <> N'SOA_DETAI'
    THROW 50001, N'Chưa chọn đúng database SOA_DETAI.', 1;

IF OBJECT_ID(N'dbo.DETAI', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DETAI (
        MaDT INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_DETAI PRIMARY KEY,
        TenDT NVARCHAR(200) NOT NULL,
        MoTa NVARCHAR(500) NULL,
        GiangVienHD NVARCHAR(100) NULL
    );
END;
GO

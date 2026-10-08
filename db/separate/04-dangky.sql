-- Chạy cả file bằng SSMS hoặc sqlcmd, không đặt trong transaction bao ngoài.
-- Có thể chạy lại: không xóa dữ liệu và không sửa cấu trúc bảng đã tồn tại.
USE [master];
GO
IF DB_ID(N'SOA_DANGKY') IS NULL
    EXEC(N'CREATE DATABASE [SOA_DANGKY]');
GO

USE [SOA_DANGKY];
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET XACT_ABORT ON;

-- Dừng nếu lệnh USE không thành công, tránh tạo bảng nhầm database.
IF DB_NAME() <> N'SOA_DANGKY'
    THROW 50001, N'Chưa chọn đúng database SOA_DANGKY.', 1;

IF OBJECT_ID(N'dbo.DANGKY', N'U') IS NULL
BEGIN
    -- MaSV và MaDT là mã tham chiếu qua API; không tạo khóa ngoại sang database khác.
    CREATE TABLE dbo.DANGKY (
        MaDK INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_DANGKY PRIMARY KEY,
        MaSV VARCHAR(20) NOT NULL,
        MaDT INT NOT NULL,
        NgayDangKy DATE NULL
            CONSTRAINT DF_DANGKY_NgayDangKy DEFAULT (GETDATE()),
        TrangThai NVARCHAR(50) NULL
    );
END;
GO

-- Chạy cả file bằng SSMS hoặc sqlcmd, không đặt trong transaction bao ngoài.
-- Có thể chạy lại: không xóa dữ liệu và không sửa cấu trúc bảng đã tồn tại.
USE [master];
GO
IF DB_ID(N'SOA_AUTH') IS NULL
    EXEC(N'CREATE DATABASE [SOA_AUTH]');
GO

USE [SOA_AUTH];
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET XACT_ABORT ON;

-- Dừng nếu lệnh USE không thành công, tránh tạo bảng nhầm database.
IF DB_NAME() <> N'SOA_AUTH'
    THROW 50001, N'Chưa chọn đúng database SOA_AUTH.', 1;

IF OBJECT_ID(N'dbo.User', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.[User] (
        IdUser INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_User PRIMARY KEY,
        UserName NVARCHAR(100) NOT NULL
            CONSTRAINT UQ_User_UserName UNIQUE,
        [Password] VARCHAR(255) NOT NULL
    );
END;
GO

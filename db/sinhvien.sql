-- Chọn database ứng dụng trước khi chạy. Không thay đổi bảng đã tồn tại.
SET XACT_ABORT ON;
IF OBJECT_ID(N'dbo.SINHVIEN', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SINHVIEN (
        MaSV NVARCHAR(50) NOT NULL CONSTRAINT PK_SINHVIEN PRIMARY KEY,
        HoTen NVARCHAR(200) NOT NULL,
        Email NVARCHAR(254) NOT NULL,
        Lop NVARCHAR(100) NOT NULL,
        MatKhau NVARCHAR(255) NOT NULL
    );
END;
GO

-- Chạy một lần trong SSMS để bổ sung snapshot tên sinh viên và tên đề tài.
-- Có thể chạy lại an toàn; dữ liệu đăng ký hiện có không bị xóa.
USE [SOA_DANGKY];
GO
IF DB_NAME() <> N'SOA_DANGKY'
    THROW 50001, N'Chưa chọn đúng database SOA_DANGKY.', 1;
GO

IF COL_LENGTH(N'dbo.DANGKY', N'HoTenSinhVien') IS NULL
    ALTER TABLE dbo.DANGKY ADD HoTenSinhVien NVARCHAR(100) NULL;
GO
IF COL_LENGTH(N'dbo.DANGKY', N'TenDeTai') IS NULL
    ALTER TABLE dbo.DANGKY ADD TenDeTai NVARCHAR(255) NULL;
GO

-- Chỉ backfill dữ liệu cũ một lần; code chạy thật không join chéo database.
IF DB_ID(N'SOA_SINHVIEN') IS NOT NULL
   AND OBJECT_ID(N'SOA_SINHVIEN.dbo.SINHVIEN', N'U') IS NOT NULL
BEGIN
    UPDATE dk
       SET HoTenSinhVien = sv.HoTen
      FROM dbo.DANGKY AS dk
      JOIN SOA_SINHVIEN.dbo.SINHVIEN AS sv ON sv.MaSV = dk.MaSV
     WHERE dk.HoTenSinhVien IS NULL;
END;
GO

IF DB_ID(N'SOA_DETAI') IS NOT NULL
   AND OBJECT_ID(N'SOA_DETAI.dbo.DETAI', N'U') IS NOT NULL
BEGIN
    UPDATE dk
       SET TenDeTai = dt.TenDT
      FROM dbo.DANGKY AS dk
      JOIN SOA_DETAI.dbo.DETAI AS dt ON dt.MaDT = dk.MaDT
     WHERE dk.TenDeTai IS NULL;
END;
GO

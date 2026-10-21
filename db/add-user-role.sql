USE [SOA_AUTH];
GO
IF DB_NAME() <> N'SOA_AUTH'
    THROW 50001, N'Chưa chọn đúng database SOA_AUTH.', 1;
IF COL_LENGTH(N'dbo.User', N'Role') IS NULL
    ALTER TABLE dbo.[User] ADD [Role] VARCHAR(20) NULL;
GO

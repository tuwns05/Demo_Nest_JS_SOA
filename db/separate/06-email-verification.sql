-- Chạy trong SSMS sau 01-auth.sql. Có thể chạy lại an toàn.
USE [SOA_AUTH];
GO
IF DB_NAME() <> N'SOA_AUTH'
    THROW 50001, N'Chưa chọn đúng database SOA_AUTH.', 1;
GO
IF OBJECT_ID(N'dbo.EmailVerification', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.EmailVerification (
        Purpose VARCHAR(30) NOT NULL,
        Target NVARCHAR(254) NOT NULL,
        CodeHash CHAR(64) NOT NULL,
        ExpiresAt DATETIME2 NOT NULL,
        LastSentAt DATETIME2 NOT NULL,
        Attempts INT NOT NULL CONSTRAINT DF_EmailVerification_Attempts DEFAULT 0,
        ConsumedAt DATETIME2 NULL,
        CONSTRAINT PK_EmailVerification PRIMARY KEY (Purpose, Target),
        CONSTRAINT CK_EmailVerification_Purpose CHECK (Purpose IN ('admin_register', 'google_link'))
    );
END;
GO

-- Chạy một lần trong SSMS sau 01-auth.sql. Có thể chạy lại an toàn.
USE [SOA_AUTH];
GO
SET XACT_ABORT ON;
IF DB_NAME() <> N'SOA_AUTH'
    THROW 50001, N'Chưa chọn đúng database SOA_AUTH.', 1;

IF OBJECT_ID(N'dbo.UserExternalIdentity', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UserExternalIdentity (
        IdUser INT NOT NULL,
        Provider VARCHAR(20) NOT NULL,
        Subject VARCHAR(255) NOT NULL,
        CONSTRAINT PK_UserExternalIdentity PRIMARY KEY (Provider, Subject),
        CONSTRAINT UQ_UserExternalIdentity_User_Provider UNIQUE (IdUser, Provider),
        CONSTRAINT FK_UserExternalIdentity_User FOREIGN KEY (IdUser)
            REFERENCES dbo.[User](IdUser),
        CONSTRAINT CK_UserExternalIdentity_Provider CHECK (Provider = 'google')
    );
END;
GO

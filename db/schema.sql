-- Chạy trong database đã chọn tại SSMS hoặc qua sqlcmd -d.
SET XACT_ABORT ON;
IF OBJECT_ID(N'dbo.User', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[User] (
        [IdUser] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_User] PRIMARY KEY,
        [UserName] NVARCHAR(100) NOT NULL CONSTRAINT [UQ_User_UserName] UNIQUE,
        [Password] VARCHAR(255) NOT NULL
    );
END;
GO

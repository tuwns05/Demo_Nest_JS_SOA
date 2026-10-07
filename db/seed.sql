-- Dữ liệu minh họa; xem db/README.md. Không ghi đè user có sẵn.
SET XACT_ABORT ON;
IF NOT EXISTS (SELECT 1 FROM [dbo].[User] WHERE [UserName] = N'demo')
BEGIN
    INSERT INTO [dbo].[User] ([UserName], [Password]) VALUES (N'demo', '$2b$12$8shVUSwL1EEDI3tK9D5w8OvE/RWpVjG37lpKLyt.X9mUigBQuBztG');
END;
GO

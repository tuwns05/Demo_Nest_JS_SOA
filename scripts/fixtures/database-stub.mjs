// Chỉ dùng trong kiểm thử; không kết nối hoặc thay đổi SQL Server thật.
import { DatabaseService } from '../../shared/database/dist/index.js';
DatabaseService.prototype.onModuleInit = async function () {};
DatabaseService.prototype.onModuleDestroy = async function () {};
DatabaseService.prototype.query = async function () {
  return { recordset: [{ result: 1 }], rowsAffected: [] };
};

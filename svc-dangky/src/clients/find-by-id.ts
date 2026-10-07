import { HttpException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import type { HttpService } from '@nestjs/axios';
import { isAxiosError } from 'axios';

export async function findById(http: HttpService, base: string, resource: string, label: string, id: string | number): Promise<unknown> {
  try {
    const response = await http.axiosRef.get(`${base.replace(/\/$/, '')}/${resource}/${encodeURIComponent(String(id))}`, {
      timeout: 5000, maxRedirects: 0,
    });
    return response.data;
  } catch (error: unknown) {
    if (isAxiosError(error) && error.response?.status === 404) {
      throw new NotFoundException(`Không tìm thấy ${label} có mã ${id}`);
    }
    if (isAxiosError(error) && error.response) {
      throw new HttpException(`Dịch vụ ${label} trả lỗi HTTP ${error.response.status}`, error.response.status);
    }
    throw new ServiceUnavailableException(`Không kết nối được dịch vụ ${label} hoặc yêu cầu đã quá thời gian chờ`);
  }
}

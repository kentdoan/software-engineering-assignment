import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  /**
   * Mục đích: Kiểm tra trạng thái hoạt động siêu nhẹ của máy chủ Backend (không truy vấn cơ sở dữ liệu).
   */
  @Get('health')
  getHealth(): { status: string } {
    return { status: 'ok' };
  }
}

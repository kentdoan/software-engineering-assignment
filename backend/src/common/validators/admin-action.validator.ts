import { BadRequestException } from '@nestjs/common';

/**
 * Mục đích: Ngăn chặn quản trị viên tự khóa, tự xóa hoặc tự phê duyệt chính tài khoản của mình.
 * Cách hoạt động: So sánh mã định danh của quản trị viên đang thao tác với mã tài khoản mục tiêu, nếu trùng nhau thì ném lỗi BadRequestException để từ chối xử lý.
 */
export function validateSelfAction(currentAdminId: string, targetUserId: string): void {
  if (currentAdminId && currentAdminId === targetUserId) {
    throw new BadRequestException(
      'Từ chối thao tác: Quản trị viên không thể tự khóa hoặc tự xóa chính tài khoản đang đăng nhập.',
    );
  }
}

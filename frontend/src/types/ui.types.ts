/** Mục đích: Đối tượng thông báo nổi hiển thị phản hồi cho người dùng ở góc màn hình. */
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

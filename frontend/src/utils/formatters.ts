/**
 * Mục đích: Định dạng số tiền theo chuẩn tiền tệ Việt Nam Đồng.
 */
export function formatVnd(amount?: number | null): string {
  return `${Math.round(amount ?? 0).toLocaleString('vi-VN')} VNĐ`;
}

/**
 * Mục đích: Chuyển đổi chuỗi thời gian ISO sang định dạng giờ và ngày ngắn gọn theo chuẩn Việt Nam.
 */
export function formatTimeShort(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
}

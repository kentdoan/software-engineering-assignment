import React from 'react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: React.ReactNode;
  cancelLabel?: string;
  confirmLabel?: string;
  confirmBusyLabel?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Mục đích: Hiển thị hộp thoại xác nhận với lớp nền tối phủ toàn màn hình (kể cả trên bản đồ Leaflet) trước khi thực hiện thao tác quan trọng.
 */
export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  description,
  cancelLabel = 'Hủy',
  confirmLabel = 'Xác nhận',
  confirmBusyLabel = 'Đang xử lý...',
  loading = false,
  onCancel,
  onConfirm,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[1px]">
      <div className="w-full max-w-md rounded-3xl border border-[#dfe5e1] bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-[#1b211e]">{title}</h3>
        <div className="mt-2 text-sm text-[#59645e]">{description}</div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-[#dfe5e1] px-5 py-2 text-sm font-medium text-[#1b211e] hover:bg-[#e9efec]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-full bg-rose-600 px-5 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
          >
            {loading ? confirmBusyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

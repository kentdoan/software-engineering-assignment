import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { ToastMessage } from '../../types/ui.types';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismissToast: (id: string) => void;
}

/**
 * Mục đích: Hiển thị danh sách thông báo nổi ở góc màn hình ở tầng cao nhất để không bị che khuất bởi bản đồ hay modal.
 */
export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismissToast }) => (
  <div className="fixed bottom-20 right-4 z-[1300] flex max-w-sm flex-col gap-2 lg:bottom-6">
    {toasts.map((toast) => {
      const styles = {
        success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
        error: 'border-rose-200 bg-rose-50 text-rose-900',
        warning: 'border-amber-200 bg-amber-50 text-amber-900',
        info: 'border-[#a8dbc3] bg-[#e6f5ee] text-[#00513b]',
      };
      return (
        <div
          key={toast.id}
          className={`flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm shadow-lg ${styles[toast.type]}`}
        >
          {toast.type === 'success' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
          {(toast.type === 'error' || toast.type === 'warning') && (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          {toast.type === 'info' && <Info className="mt-0.5 h-4 w-4 shrink-0" />}
          <p className="flex-1 text-xs font-medium leading-relaxed">{toast.message}</p>
          <button
            type="button"
            onClick={() => onDismissToast(toast.id)}
            className="opacity-60 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      );
    })}
  </div>
);

import React from 'react';
import { CheckCircle2, UserCheck, XCircle } from 'lucide-react';
import { User } from '../../types/user.types';
import { formatTimeShort } from '../../utils/formatters';
import { renderAccountStatusBadge } from '../ui/Badges';

interface RegistrationsTableProps {
  items: User[];
  busyId: string | null;
  onApprove: (user: User) => void;
  onOpenReject: (user: User) => void;
}

/**
 * Mục đích: Hiển thị bảng danh sách hồ sơ đăng ký Nhân viên vận hành kèm nút Phê duyệt và Từ chối.
 */
export const RegistrationsTable: React.FC<RegistrationsTableProps> = ({
  items,
  busyId,
  onApprove,
  onOpenReject,
}) => (
  <div className="rounded-3xl border border-[#dfe5e1] bg-white p-6 shadow-sm">
    {items.length === 0 ? (
      <div className="flex flex-col items-center py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e6f5ee] text-[#006a4e]">
          <UserCheck className="h-6 w-6" />
        </div>
        <p className="mt-3 text-sm font-bold text-[#1b211e]">Không có hồ sơ nào đang chờ xử lý</p>
        <p className="mt-1 text-xs text-[#59645e]">
          Tất cả yêu cầu đăng ký Nhân viên vận hành đã được kiểm duyệt.
        </p>
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#dfe5e1] bg-[#f8f9fa] text-[#59645e]">
              <th className="px-4 py-3 font-bold">Ứng viên Nhân viên vận hành</th>
              <th className="px-4 py-3 font-bold">Mã NV / Đơn vị</th>
              <th className="px-4 py-3 font-bold">CCCD & SĐT</th>
              <th className="px-4 py-3 font-bold">Ngày gửi</th>
              <th className="px-4 py-3 font-bold">Trạng thái</th>
              <th className="px-4 py-3 text-right font-bold">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#dfe5e1]">
            {items.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3.5">
                  <p className="font-bold text-[#1b211e]">{u.name}</p>
                  <p className="text-[#59645e]">{u.email}</p>
                </td>
                <td className="px-4 py-3.5">
                  <p className="font-bold text-[#006a4e]">{u.staffId || '—'}</p>
                  <p className="text-[#59645e]">{u.department || 'Vận hành Hub'}</p>
                </td>
                <td className="px-4 py-3.5 text-[#59645e]">
                  <p>{u.phone}</p>
                  <p>CCCD: {u.citizenId || '—'}</p>
                </td>
                <td className="px-4 py-3.5 text-[#59645e]">{formatTimeShort(u.createdAt)}</td>
                <td className="px-4 py-3.5">
                  {renderAccountStatusBadge(u.status)}
                  {u.rejectReason && u.status === 'REJECTED' && (
                    <p className="mt-1 max-w-[180px] text-[11px] text-rose-700">{u.rejectReason}</p>
                  )}
                </td>
                <td className="px-4 py-3.5 text-right">
                  {u.status === 'PENDING_APPROVAL' ? (
                    <div className="inline-flex gap-2">
                      <button
                        type="button"
                        disabled={busyId === u.id}
                        onClick={() => onApprove(u)}
                        className="inline-flex items-center gap-1 rounded-full bg-[#006a4e] px-3.5 py-1.5 font-bold text-white hover:bg-[#00513b] disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Phê duyệt
                      </button>
                      <button
                        type="button"
                        disabled={busyId === u.id}
                        onClick={() => onOpenReject(u)}
                        className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1.5 font-bold text-rose-700 hover:bg-rose-100"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Từ chối
                      </button>
                    </div>
                  ) : (
                    <span className="text-[#87938c]">Đã xử lý</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

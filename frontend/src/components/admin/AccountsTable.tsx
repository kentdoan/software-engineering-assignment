import React from 'react';
import { Eye, Lock, Trash2, Unlock } from 'lucide-react';
import { User, UserRole } from '../../types/user.types';
import { formatVnd } from '../../utils/formatters';
import { renderAccountStatusBadge } from '../ui/Badges';

export const ROLE_LABELS: Record<UserRole, string> = {
  STUDENT: 'Sinh viên',
  OPERATOR: 'Nhân viên vận hành',
  ADMIN: 'Quản trị viên',
};

interface AccountsTableProps {
  accounts: User[];
  currentAdminId: string;
  onOpenHistory: (userId: string) => void;
  onToggleLock: (user: User) => void;
  onRequestDelete: (user: User) => void;
}

/**
 * Mục đích: Hiển thị bảng danh sách tài khoản người dùng toàn hệ thống cùng thao tác xem chi tiết, khóa/mở khóa và xóa.
 */
export const AccountsTable: React.FC<AccountsTableProps> = ({
  accounts,
  currentAdminId,
  onOpenHistory,
  onToggleLock,
  onRequestDelete,
}) => (
  <div className="rounded-3xl border border-[#dfe5e1] bg-white p-5 shadow-sm">
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-[#dfe5e1] bg-[#f8f9fa] text-[#59645e]">
            <th className="px-4 py-3 font-bold">Người dùng</th>
            <th className="px-4 py-3 font-bold">Vai trò & Mã định danh</th>
            <th className="px-4 py-3 font-bold">Ví / Phí tồn đọng</th>
            <th className="px-4 py-3 font-bold">Trạng thái</th>
            <th className="px-4 py-3 text-right font-bold">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#dfe5e1]">
          {accounts.map((u) => {
            const isSelf = u.id === currentAdminId;
            return (
              <tr key={u.id} className="hover:bg-[#f8f9fa]">
                <td className="px-4 py-3.5">
                  <p className="font-bold text-[#1b211e]">
                    {u.name}{' '}
                    {isSelf && <span className="text-[11px] font-normal text-[#006a4e]">(Bạn)</span>}
                  </p>
                  <p className="text-[#59645e]">
                    {u.email} · {u.phone}
                  </p>
                </td>
                <td className="px-4 py-3.5">
                  <p className="font-bold text-[#1b211e]">{ROLE_LABELS[u.role]}</p>
                  <p className="text-[#59645e]">{u.studentId || u.staffId || '—'}</p>
                </td>
                <td className="px-4 py-3.5 text-[#59645e]">
                  {u.role === 'STUDENT' ? (
                    <>
                      <p className="font-medium text-[#006a4e]">{formatVnd(u.balance)}</p>
                      {(u.unpaidFee ?? 0) > 0 && (
                        <p className="font-bold text-rose-600">Nợ: {formatVnd(u.unpaidFee)}</p>
                      )}
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3.5">{renderAccountStatusBadge(u.status)}</td>
                <td className="px-4 py-3.5 text-right">
                  <div className="inline-flex flex-wrap justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenHistory(u.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-[#dfe5e1] bg-white px-3 py-1.5 font-medium text-[#1b211e] hover:bg-[#e9efec]"
                    >
                      <Eye className="h-3.5 w-3.5" /> Chi tiết
                    </button>
                    {!isSelf && u.status !== 'PENDING_APPROVAL' && (
                      <button
                        type="button"
                        onClick={() => onToggleLock(u)}
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-bold ${
                          u.status === 'LOCKED'
                            ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                        }`}
                      >
                        {u.status === 'LOCKED' ? (
                          <>
                            <Unlock className="h-3.5 w-3.5" /> Mở khóa
                          </>
                        ) : (
                          <>
                            <Lock className="h-3.5 w-3.5" /> Khóa
                          </>
                        )}
                      </button>
                    )}
                    {!isSelf && (
                      <button
                        type="button"
                        onClick={() => onRequestDelete(u)}
                        aria-label={`Xóa ${u.name}`}
                        className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1.5 font-bold text-rose-700 hover:bg-rose-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

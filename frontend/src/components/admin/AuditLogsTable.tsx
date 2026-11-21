import React from 'react';
import { Search } from 'lucide-react';
import { AuditCategory, AuditLogEntry } from '../../types/user.types';
import { formatTimeShort } from '../../utils/formatters';
import { renderAuditCategoryBadge, StatusBadge } from '../ui/Badges';

const CATEGORIES: { id: AuditCategory | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'QUAN_TRI', label: 'Quản trị' },
  { id: 'CANH_BAO', label: 'Cảnh báo' },
  { id: 'VAN_HANH', label: 'Vận hành' },
  { id: 'API', label: 'API' },
];

interface AuditLogsTableProps {
  logs: AuditLogEntry[];
  category: AuditCategory | 'ALL';
  searchText: string;
  onChangeCategory: (category: AuditCategory | 'ALL') => void;
  onChangeSearchText: (value: string) => void;
}

/**
 * Mục đích: Kết hợp thanh lọc danh mục, tìm kiếm và bảng hiển thị danh sách nhật ký kiểm toán hệ thống.
 */
export const AuditLogsTable: React.FC<AuditLogsTableProps> = ({
  logs,
  category,
  searchText,
  onChangeCategory,
  onChangeSearchText,
}) => (
  <>
    <div className="flex flex-col gap-3 rounded-3xl border border-[#dfe5e1] bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onChangeCategory(c.id)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
              category === c.id
                ? 'bg-[#ccebdd] text-[#00513b]'
                : 'bg-[#f8f9fa] text-[#59645e] hover:bg-[#e9efec]'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="relative w-full lg:w-80">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#59645e]" />
        <input
          value={searchText}
          onChange={(e) => onChangeSearchText(e.target.value)}
          placeholder="Tìm nội dung nhật ký, tác nhân..."
          className="w-full rounded-full border border-[#dfe5e1] bg-[#f8f9fa] py-2 pl-10 pr-4 text-xs outline-none focus:border-[#006a4e] focus:bg-white"
        />
      </div>
    </div>

    <div className="rounded-3xl border border-[#dfe5e1] bg-white p-5 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#dfe5e1] bg-[#f8f9fa] text-[#59645e]">
              <th className="px-4 py-3 font-bold">Thời gian</th>
              <th className="px-4 py-3 font-bold">Phân loại</th>
              <th className="px-4 py-3 font-bold">Tác nhân</th>
              <th className="px-4 py-3 font-bold">Nội dung chi tiết</th>
              <th className="px-4 py-3 font-bold">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#dfe5e1]">
            {logs.map((entry) => (
              <tr key={entry.id} className="hover:bg-[#f8f9fa]">
                <td className="whitespace-nowrap px-4 py-3 text-[#59645e]">
                  {formatTimeShort(entry.timestamp)}
                </td>
                <td className="px-4 py-3">{renderAuditCategoryBadge(entry.category)}</td>
                <td className="px-4 py-3">
                  <p className="font-bold text-[#1b211e]">{entry.actorName}</p>
                  <p className="text-[11px] text-[#59645e]">IP: {entry.ipAddress}</p>
                </td>
                <td className="px-4 py-3 text-[#1b211e]">{entry.description}</td>
                <td className="px-4 py-3">
                  {entry.status === 'SUCCESS' && <StatusBadge variant="success">Thành công</StatusBadge>}
                  {entry.status === 'WARNING' && <StatusBadge variant="warning">Cảnh báo</StatusBadge>}
                  {entry.status === 'ERROR' && <StatusBadge variant="danger">Lỗi</StatusBadge>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </>
);

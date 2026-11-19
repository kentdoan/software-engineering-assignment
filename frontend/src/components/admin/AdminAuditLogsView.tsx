import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  Download,
  FileText,
  Search,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { getErrorMessage, usersApi } from '../../services/api';
import { AuditCategory, AuditLogEntry } from '../../types';
import { formatTimeShort, MetricCard, renderAuditCategoryBadge, StatusBadge } from '../ui/Badges';

interface AdminAuditLogsViewProps {
  notify: (type: 'success' | 'error' | 'warning' | 'info', msg: string) => void;
}

const CATEGORIES: { id: AuditCategory | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'QUAN_TRI', label: 'Quản trị' },
  { id: 'CANH_BAO', label: 'Cảnh báo' },
  { id: 'VAN_HANH', label: 'Vận hành' },
  { id: 'API', label: 'API' },
];

export const AdminAuditLogsView: React.FC<AdminAuditLogsViewProps> = ({ notify }) => {
  const [category, setCategory] = useState<AuditCategory | 'ALL'>('ALL');
  const [searchText, setSearchText] = useState('');
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [summary, setSummary] = useState({
    totalLogs: 0,
    todayActions: 0,
    securityWarnings: 0,
    onlineAdmins: 1,
  });

  const loadLogs = useCallback(async () => {
    try {
      const res = await usersApi.listAuditLogs({
        category,
        q: searchText || undefined,
      });
      if (res.logs) setLogs(res.logs);
      if (res.summary) setSummary(res.summary);
    } catch (err) {
      notify('error', getErrorMessage(err));
    }
  }, [category, searchText, notify]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const handleExportCsv = async () => {
    try {
      const res = await usersApi.listAuditLogs({
        category,
        q: searchText || undefined,
        format: 'csv',
      });
      const csvContent = res.csv || '';
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nhat-ky-he-thong-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      notify('success', `Đã xuất ${res.total ?? logs.length} bản ghi nhật ký ra tệp CSV.`);
    } catch (err) {
      notify('error', getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#1b211e]">Nhật ký & Giám sát Hệ thống</h2>
          <p className="mt-1 text-sm text-[#59645e]">
            Theo dõi toàn bộ dấu vết thao tác quản trị, cảnh báo an ninh và biến động vận hành tại ĐHQG-HCM
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex items-center gap-2 rounded-full border border-[#006a4e] bg-white px-4 py-2 text-xs font-bold text-[#006a4e] hover:bg-[#e6f5ee]"
        >
          <Download className="h-4 w-4" /> Xuất tệp CSV
        </button>
      </div>

      {/* Clean 4 KPI Cards (Fixed Figma Audit KPIs - Zero "A" overlap) */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Tổng bản ghi"
          value={summary.totalLogs}
          sublabel="Lưu trữ trong hệ thống"
          icon={<FileText className="h-5 w-5" />}
          accent="emerald"
        />
        <MetricCard
          label="Thao tác hôm nay"
          value={summary.todayActions}
          sublabel="Trong 24 giờ gần nhất"
          icon={<Activity className="h-5 w-5" />}
          accent="sky"
        />
        <MetricCard
          label="Cảnh báo bảo mật"
          value={summary.securityWarnings}
          sublabel="Cần quản trị viên rà soát"
          icon={<ShieldAlert className="h-5 w-5" />}
          accent="amber"
        />
        <MetricCard
          label="Quản trị trực tuyến"
          value={summary.onlineAdmins}
          sublabel="Phiên quản trị hợp lệ"
          icon={<Users className="h-5 w-5" />}
          accent="emerald"
        />
      </div>

      {/* Category Filter Tabs + Search */}
      <div className="flex flex-col gap-3 rounded-3xl border border-[#dfe5e1] bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
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
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Tìm nội dung nhật ký, tác nhân..."
            className="w-full rounded-full border border-[#dfe5e1] bg-[#f8f9fa] py-2 pl-10 pr-4 text-xs outline-none focus:border-[#006a4e] focus:bg-white"
          />
        </div>
      </div>

      {/* Audit Logs Table */}
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
                  <td className="px-4 py-3 whitespace-nowrap text-[#59645e]">
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
    </div>
  );
};

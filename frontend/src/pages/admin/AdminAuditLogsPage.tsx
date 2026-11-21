import React, { useCallback, useEffect, useState } from 'react';
import { Activity, Download, FileText, ShieldAlert, Users } from 'lucide-react';
import { AuditLogsTable } from '../../components/admin/AuditLogsTable';
import { MetricCard } from '../../components/ui/MetricCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { getErrorMessage } from '../../services/httpClient';
import { usersApi } from '../../services/users.api';
import { AuditCategory, AuditLogEntry } from '../../types/user.types';

interface AdminAuditLogsPageProps {
  notify: (type: 'success' | 'error' | 'warning' | 'info', msg: string) => void;
}

/**
 * Mục đích: Trang Nhật ký Hệ thống tổng hợp chỉ số kiểm toán, lọc sự kiện theo phân loại và xuất tệp CSV.
 */
export const AdminAuditLogsPage: React.FC<AdminAuditLogsPageProps> = ({ notify }) => {
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
      <PageHeader
        title="Nhật ký & Giám sát Hệ thống"
        description="Theo dõi toàn bộ dấu vết thao tác quản trị, cảnh báo an ninh và biến động vận hành tại ĐHQG-HCM"
        action={
          <button
            type="button"
            onClick={() => void handleExportCsv()}
            className="inline-flex items-center gap-2 rounded-full border border-[#006a4e] bg-white px-4 py-2 text-xs font-bold text-[#006a4e] hover:bg-[#e6f5ee]"
          >
            <Download className="h-4 w-4" /> Xuất tệp CSV
          </button>
        }
      />

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

      <AuditLogsTable
        logs={logs}
        category={category}
        searchText={searchText}
        onChangeCategory={setCategory}
        onChangeSearchText={setSearchText}
      />
    </div>
  );
};

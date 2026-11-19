import React from 'react';
import {
  AccountStatus,
  AuditCategory,
  ChargingPointStatus,
  DispatchOrder,
  HubStatus,
  IncidentReport,
  VehicleStatus,
} from '../../types';

export function formatVnd(amount?: number | null): string {
  return `${Math.round(amount ?? 0).toLocaleString('vi-VN')} VNĐ`;
}

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

export const StatusBadge: React.FC<{
  variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'emerald';
  children: React.ReactNode;
}> = ({ variant, children }) => {
  const palette: Record<string, string> = {
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    emerald: 'bg-[#ccebdd] text-[#00513b] border-[#a8dbc3]',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    danger: 'bg-rose-50 text-rose-800 border-rose-200',
    info: 'bg-sky-50 text-sky-800 border-sky-200',
    neutral: 'bg-[#e9efec] text-[#59645e] border-[#dfe5e1]',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${palette[variant]}`}
    >
      {children}
    </span>
  );
};

export function renderVehicleStatusBadge(status: VehicleStatus) {
  switch (status) {
    case 'AVAILABLE':
      return <StatusBadge variant="success">Sẵn sàng</StatusBadge>;
    case 'BOOKED':
      return <StatusBadge variant="info">Đã giữ chỗ</StatusBadge>;
    case 'IN_USE':
      return <StatusBadge variant="emerald">Đang vận hành</StatusBadge>;
    case 'CHARGING':
      return <StatusBadge variant="warning">Đang sạc</StatusBadge>;
    case 'UNDER_MAINTENANCE':
    case 'FAULTY':
      return <StatusBadge variant="danger">Bảo trì / Lỗi</StatusBadge>;
    default:
      return <StatusBadge variant="neutral">{status}</StatusBadge>;
  }
}

export function renderHubStatusBadge(status?: HubStatus) {
  if (status === 'LOW_VEHICLES') return <StatusBadge variant="danger">Thiếu xe</StatusBadge>;
  if (status === 'HIGH_OCCUPANCY') return <StatusBadge variant="warning">Sắp đầy bãi</StatusBadge>;
  return <StatusBadge variant="success">Ổn định</StatusBadge>;
}

export function renderChargingPointBadge(status: ChargingPointStatus) {
  switch (status) {
    case 'AVAILABLE':
      return <StatusBadge variant="success">Trụ trống</StatusBadge>;
    case 'RESERVED':
      return <StatusBadge variant="info">Đã đặt trước</StatusBadge>;
    case 'CHARGING':
      return <StatusBadge variant="warning">Đang sạc</StatusBadge>;
    case 'MAINTENANCE':
      return <StatusBadge variant="danger">Bảo trì</StatusBadge>;
  }
}

export function renderAccountStatusBadge(status: AccountStatus) {
  switch (status) {
    case 'ACTIVE':
      return <StatusBadge variant="success">Đang hoạt động</StatusBadge>;
    case 'PENDING_APPROVAL':
      return <StatusBadge variant="warning">Chờ phê duyệt</StatusBadge>;
    case 'LOCKED':
      return <StatusBadge variant="danger">Đã khóa</StatusBadge>;
    case 'REJECTED':
      return <StatusBadge variant="neutral">Từ chối</StatusBadge>;
    case 'DELETED':
      return <StatusBadge variant="neutral">Đã xóa</StatusBadge>;
  }
}

export function renderDispatchBadge(status: DispatchOrder['status']) {
  if (status === 'IN_TRANSIT') return <StatusBadge variant="warning">Đang chuyển</StatusBadge>;
  if (status === 'COMPLETED') return <StatusBadge variant="success">Hoàn tất</StatusBadge>;
  return <StatusBadge variant="neutral">Đã hủy</StatusBadge>;
}

export function renderIncidentBadge(status: IncidentReport['status']) {
  if (status === 'OPEN') return <StatusBadge variant="danger">Đang xử lý</StatusBadge>;
  if (status === 'IN_PROGRESS') return <StatusBadge variant="warning">Đang kiểm tra</StatusBadge>;
  return <StatusBadge variant="success">Đã khắc phục</StatusBadge>;
}

export function renderAuditCategoryBadge(category: AuditCategory) {
  switch (category) {
    case 'QUAN_TRI':
      return <StatusBadge variant="emerald">Quản trị</StatusBadge>;
    case 'CANH_BAO':
      return <StatusBadge variant="warning">Cảnh báo</StatusBadge>;
    case 'VAN_HANH':
      return <StatusBadge variant="info">Vận hành</StatusBadge>;
    case 'API':
      return <StatusBadge variant="neutral">API</StatusBadge>;
  }
}

export const MetricCard: React.FC<{
  label: string;
  value: string | number;
  sublabel?: string;
  icon: React.ReactNode;
  accent?: 'emerald' | 'amber' | 'rose' | 'sky';
}> = ({ label, value, sublabel, icon, accent = 'emerald' }) => {
  const iconColors = {
    emerald: 'bg-[#e6f5ee] text-[#006a4e]',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
    sky: 'bg-sky-50 text-sky-700',
  };
  return (
    <div className="rounded-2xl border border-[#dfe5e1] bg-white p-5 shadow-sm transition hover:border-[#b9cbc3]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[#59645e]">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[#1b211e]">{value}</p>
          {sublabel && <p className="mt-1 text-xs text-[#59645e]">{sublabel}</p>}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconColors[accent]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

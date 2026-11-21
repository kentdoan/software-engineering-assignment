import React from 'react';
import { ChargingPointStatus } from '../../types/charging.types';
import { HubStatus, VehicleStatus } from '../../types/hub.types';
import { DispatchOrder, IncidentReport } from '../../types/operations.types';
import { AccountStatus, AuditCategory } from '../../types/user.types';

/**
 * Mục đích: Hiển thị nhãn trạng thái dạng viên thuốc với bảng màu đồng nhất toàn hệ thống.
 */
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

/**
 * Mục đích: Trả về nhãn hiển thị tương ứng với trạng thái phương tiện dùng chung.
 */
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

/**
 * Mục đích: Trả về nhãn hiển thị mức độ khả dụng hiện tại của một trạm Hub.
 */
export function renderHubStatusBadge(status?: HubStatus) {
  if (status === 'LOW_VEHICLES') return <StatusBadge variant="danger">Thiếu xe</StatusBadge>;
  if (status === 'HIGH_OCCUPANCY') return <StatusBadge variant="warning">Sắp đầy bãi</StatusBadge>;
  return <StatusBadge variant="success">Ổn định</StatusBadge>;
}

/**
 * Mục đích: Trả về nhãn trạng thái hoạt động của trụ sạc.
 */
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

/**
 * Mục đích: Trả về nhãn trạng thái của tài khoản người dùng.
 */
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

/**
 * Mục đích: Trả về nhãn tiến độ của lệnh điều phối phương tiện.
 */
export function renderDispatchBadge(status: DispatchOrder['status']) {
  if (status === 'IN_TRANSIT') return <StatusBadge variant="warning">Đang chuyển</StatusBadge>;
  if (status === 'COMPLETED') return <StatusBadge variant="success">Hoàn tất</StatusBadge>;
  return <StatusBadge variant="neutral">Đã hủy</StatusBadge>;
}

/**
 * Mục đích: Trả về nhãn tiến độ xử lý báo cáo sự cố thiết bị.
 */
export function renderIncidentBadge(status: IncidentReport['status']) {
  if (status === 'OPEN') return <StatusBadge variant="danger">Đang xử lý</StatusBadge>;
  if (status === 'IN_PROGRESS') return <StatusBadge variant="warning">Đang kiểm tra</StatusBadge>;
  return <StatusBadge variant="success">Đã khắc phục</StatusBadge>;
}

/**
 * Mục đích: Trả về nhãn phân loại nhóm sự kiện của nhật ký kiểm toán.
 */
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

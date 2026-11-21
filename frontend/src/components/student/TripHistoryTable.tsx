import React from 'react';
import { Rental } from '../../types/rental.types';
import { formatVnd } from '../../utils/formatters';

interface TripHistoryTableProps {
  history: Rental[];
}

/**
 * Mục đích: Hiển thị bảng lịch sử các chuyến đi xe điện đã hoàn tất của sinh viên.
 */
export const TripHistoryTable: React.FC<TripHistoryTableProps> = ({ history }) => (
  <div className="rounded-3xl border border-[#dfe5e1] bg-white p-6 shadow-sm">
    <h3 className="text-base font-bold text-[#1b211e]">Lịch sử chuyến đi đã hoàn tất</h3>
    {history.length === 0 ? (
      <p className="mt-3 text-xs text-[#59645e]">Chưa có chuyến đi nào được ghi nhận trong phiên này.</p>
    ) : (
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#dfe5e1] bg-[#f8f9fa] text-[#59645e]">
              <th className="px-3 py-2.5 font-bold">Phương tiện</th>
              <th className="px-3 py-2.5 font-bold">Lộ trình</th>
              <th className="px-3 py-2.5 font-bold">Thời lượng</th>
              <th className="px-3 py-2.5 font-bold">Ô đỗ trả</th>
              <th className="px-3 py-2.5 font-bold">Cước phí</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#dfe5e1]">
            {history.map((item) => (
              <tr key={item.id}>
                <td className="px-3 py-2.5 font-bold text-[#1b211e]">
                  {item.vehicle?.plateNumber || item.vehicleId}
                </td>
                <td className="px-3 py-2.5 text-[#59645e]">
                  {item.originHub?.name || item.originHubId} →{' '}
                  {item.destinationHub?.name || item.destinationHubId}
                </td>
                <td className="px-3 py-2.5 text-[#59645e]">{item.durationMinutes} phút</td>
                <td className="px-3 py-2.5 font-medium text-[#006a4e]">
                  {item.returnBayCode || '—'}
                </td>
                <td className="px-3 py-2.5 font-bold text-[#1b211e]">{formatVnd(item.fare)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

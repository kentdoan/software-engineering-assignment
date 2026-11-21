import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { IncidentReport } from '../../types/operations.types';
import { formatTimeShort } from '../../utils/formatters';
import { renderIncidentBadge } from '../ui/Badges';

interface IncidentHistoryListProps {
  incidents: IncidentReport[];
  onResolve: (id: string) => void;
}

/**
 * Mục đích: Hiển thị danh sách hồ sơ sự cố phương tiện/trụ sạc đã ghi nhận kèm nút hoàn tất khắc phục.
 */
export const IncidentHistoryList: React.FC<IncidentHistoryListProps> = ({
  incidents,
  onResolve,
}) => (
  <div className="rounded-3xl border border-[#dfe5e1] bg-white p-6 shadow-sm lg:col-span-7">
    <h3 className="text-base font-bold text-[#1b211e]">Hồ sơ sự cố thiết bị</h3>
    <div className="mt-4 space-y-3">
      {incidents.map((inc) => (
        <div key={inc.id} className="rounded-2xl border border-[#dfe5e1] bg-[#f8f9fa] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-sm font-bold text-[#1b211e]">{inc.code}</span>
              <span className="ml-2 text-xs font-medium text-[#006a4e]">{inc.resourceLabel}</span>
            </div>
            {renderIncidentBadge(inc.status)}
          </div>
          <p className="mt-1 text-xs font-bold text-[#1b211e]">{inc.incidentType}</p>
          <p className="mt-1 text-xs text-[#59645e]">{inc.description}</p>
          {inc.affectedSummary && (
            <p className="mt-2 rounded-xl bg-white px-3 py-1.5 text-[11px] font-medium text-[#00513b]">
              Xử lý tự động: {inc.affectedSummary}
            </p>
          )}
          <div className="mt-2 flex items-center justify-between text-[11px] text-[#59645e]">
            <span>Ghi nhận: {formatTimeShort(inc.createdAt)}</span>
            {inc.status !== 'RESOLVED' && (
              <button
                type="button"
                onClick={() => onResolve(inc.id)}
                className="inline-flex items-center gap-1 rounded-full bg-[#006a4e] px-3 py-1 font-bold text-white hover:bg-[#00513b]"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Hoàn tất khắc phục
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);

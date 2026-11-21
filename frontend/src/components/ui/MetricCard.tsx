import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: React.ReactNode;
  accent?: 'emerald' | 'amber' | 'rose' | 'sky';
}

/**
 * Mục đích: Hiển thị thẻ chỉ số thống kê KPI kèm biểu tượng và chú thích phụ trên các trang giám sát và quản trị.
 */
export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  sublabel,
  icon,
  accent = 'emerald',
}) => {
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

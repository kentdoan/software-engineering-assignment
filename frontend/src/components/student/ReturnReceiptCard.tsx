import React from 'react';
import { Receipt } from 'lucide-react';
import { ReturnReceiptResponse } from '../../types/rental.types';
import { formatVnd } from '../../utils/formatters';

interface ReturnReceiptCardProps {
  receiptData: ReturnReceiptResponse;
}

/**
 * Mục đích: Hiển thị biên lai điện tử chi tiết ô đỗ, quãng đường, cước phí và mức pin sau khi trả xe thành công.
 */
export const ReturnReceiptCard: React.FC<ReturnReceiptCardProps> = ({ receiptData }) => (
  <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
    <div className="flex items-center gap-2 text-base font-bold text-emerald-900">
      <Receipt className="h-5 w-5" />
      <span>Biên lai điện tử hoàn tất chuyến đi</span>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-4">
      <div className="rounded-2xl bg-white p-3">
        <p className="text-[11px] text-[#59645e]">Ô đỗ chỉ định</p>
        <p className="mt-1 text-base font-bold text-[#006a4e]">{receiptData.receipt.bayCode}</p>
      </div>
      <div className="rounded-2xl bg-white p-3">
        <p className="text-[11px] text-[#59645e]">Quãng đường / Thời gian</p>
        <p className="mt-1 text-base font-bold text-[#1b211e]">
          {receiptData.receipt.distanceKm} km · {receiptData.receipt.durationMinutes} phút
        </p>
      </div>
      <div className="rounded-2xl bg-white p-3">
        <p className="text-[11px] text-[#59645e]">Tổng cước phí</p>
        <p className="mt-1 text-base font-bold text-[#1b211e]">
          {formatVnd(receiptData.receipt.fare)}
        </p>
      </div>
      <div className="rounded-2xl bg-white p-3">
        <p className="text-[11px] text-[#59645e]">Pin sau chuyến đi</p>
        <p className="mt-1 text-base font-bold text-[#006a4e]">
          {receiptData.receipt.newBatterySoc}%{' '}
          {receiptData.receipt.autoQueuedForCharging ? '(Đã đưa vào hàng đợi sạc)' : ''}
        </p>
      </div>
    </div>
  </div>
);

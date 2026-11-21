import React from 'react';

interface PageHeaderProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

/**
 * Mục đích: Hiển thị phần tiêu đề chuẩn đầu mỗi trang gồm tên trang, mô tả ngắn gọn và nút thao tác bên phải nếu có.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, action }) => (
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h2 className="text-2xl font-bold text-[#1b211e]">{title}</h2>
      <p className="mt-1 text-sm text-[#59645e]">{description}</p>
    </div>
    {action && <div>{action}</div>}
  </div>
);

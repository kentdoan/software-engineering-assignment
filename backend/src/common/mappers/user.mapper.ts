import { User } from '../interfaces';

/**
 * Mục đích: Chuyển đổi một bản ghi người dùng từ cấu trúc bảng Prisma sang đối tượng User chuẩn để sử dụng trong ứng dụng.
 * Cách hoạt động: Đọc các cột ở dạng snake_case từ bảng users cùng bảng phụ student_profiles và operator_profiles (nếu có), sau đó gộp thành một đối tượng User phẳng với các thuộc tính dạng camelCase và chuyển ngày tạo sang chuỗi ISO.
 */
export function mapUserFromPrisma(row: {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: User['role'];
  status: User['status'];
  citizen_id: string | null;
  reject_reason: string | null;
  created_at: Date;
  student_profiles?: {
    student_id: string | null;
    university: string | null;
    balance: number;
    unpaid_fee: number;
  } | null;
  operator_profiles?: {
    staff_id: string;
    department: string | null;
  } | null;
}): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    status: row.status,
    studentId: row.student_profiles?.student_id ?? undefined,
    university: row.student_profiles?.university ?? undefined,
    balance: row.student_profiles?.balance,
    unpaidFee: row.student_profiles?.unpaid_fee ?? 0,
    staffId: row.operator_profiles?.staff_id ?? undefined,
    department: row.operator_profiles?.department ?? undefined,
    citizenId: row.citizen_id ?? undefined,
    rejectReason: row.reject_reason ?? undefined,
    createdAt: row.created_at.toISOString(),
  };
}

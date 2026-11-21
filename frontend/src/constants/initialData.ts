import { Hub } from '../types/hub.types';

export const VNU_DEFAULT_CENTER = {
  latitude: 10.8762,
  longitude: 106.7985,
  label: 'Khu đô thị ĐHQG-HCM',
};

export const DEMO_ACCOUNTS = [
  {
    role: 'STUDENT' as const,
    label: 'Sinh viên',
    sublabel: 'Nguyễn Văn A (MSSV 2313940)',
    email: 'a.nguyen23@vnuhcm.edu.vn',
    password: '123456',
  },
  {
    role: 'OPERATOR' as const,
    label: 'Nhân viên vận hành',
    sublabel: 'Lê Thành Tiến (Vận hành Hub)',
    email: 'tien.le@emobility.vnuhcm.edu.vn',
    password: '123456',
  },
  {
    role: 'ADMIN' as const,
    label: 'Quản trị viên',
    sublabel: 'Quản trị Hệ thống',
    email: 'admin@emobility.vnuhcm.edu.vn',
    password: '123456',
  },
];

export const INITIAL_HUBS_FALLBACK: Hub[] = [
  {
    id: 'hub-01',
    name: 'Trạm Ga Metro ĐHQG',
    latitude: 10.8752,
    longitude: 106.8009,
    totalDocks: 15,
    totalChargingPorts: 6,
    description: 'Cửa ngõ kết nối tuyến Metro số 1 Bến Thành - Suối Tiên vào Khu đô thị ĐHQG-HCM',
  },
  {
    id: 'hub-02',
    name: 'Trạm ĐH Bách Khoa - CS2',
    latitude: 10.8805,
    longitude: 106.8055,
    totalDocks: 20,
    totalChargingPorts: 8,
    description: 'Khuôn viên Trường Đại học Bách Khoa - Cơ sở Dĩ An',
  },
  {
    id: 'hub-03',
    name: 'Trạm KTX Khu A',
    latitude: 10.8782,
    longitude: 106.7952,
    totalDocks: 25,
    totalChargingPorts: 10,
    description: 'Khu ký túc xá A ĐHQG-HCM phục vụ sinh viên nội trú',
  },
  {
    id: 'hub-04',
    name: 'Trạm KTX Khu B',
    latitude: 10.8841,
    longitude: 106.7821,
    totalDocks: 30,
    totalChargingPorts: 12,
    description: 'Cụm Ký túc xá Khu B ĐHQG-HCM với mật độ sinh viên cao nhất',
  },
  {
    id: 'hub-05',
    name: 'Trạm ĐH Công nghệ Thông tin (UIT)',
    latitude: 10.8702,
    longitude: 106.8032,
    totalDocks: 15,
    totalChargingPorts: 6,
    description: 'Cửa chính Trường Đại học Công nghệ Thông tin - ĐHQG-HCM',
  },
  {
    id: 'hub-06',
    name: 'Trạm Thư viện Trung tâm ĐHQG',
    latitude: 10.8698,
    longitude: 106.7995,
    totalDocks: 15,
    totalChargingPorts: 6,
    description: 'Quảng trường Thư viện Trung tâm ĐHQG-HCM',
  },
];

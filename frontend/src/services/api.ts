import axios from 'axios';
import {
  AccountStatus,
  ActiveBookingsBundle,
  AuditCategory,
  AuditLogEntry,
  Booking,
  ChargingPoint,
  ChargingSession,
  ChargingSlotProposal,
  DispatchOrder,
  GreedyScheduleItem,
  Hub,
  HubAlert,
  IncidentReport,
  MonitoringStats,
  ParkingBooking,
  PrivateVehicle,
  Rental,
  ReturnReceiptResponse,
  Scenario,
  SimulationStatus,
  User,
  UserRole,
} from '../types';

const TOKEN_KEY = 'semh_auth_token';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function setAuthToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getErrorMessage(err: unknown, fallback = 'Đã xảy ra lỗi kết nối.'): string {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (Array.isArray(msg)) return msg.join(', ');
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export const authApi = {
  login: async (email: string, password: string): Promise<{ token: string; user: User }> => {
    const res = await api.post('/auth/login', { email, password });
    setAuthToken(res.data.token);
    return res.data;
  },
  register: async (payload: {
    name: string;
    email: string;
    password: string;
    phone: string;
    role: UserRole;
    studentId?: string;
    university?: string;
    staffId?: string;
    department?: string;
    citizenId?: string;
  }): Promise<{ message: string; user: User }> => {
    const res = await api.post('/auth/register', payload);
    return res.data;
  },
  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } finally {
      setAuthToken(null);
    }
  },
  me: async (): Promise<User> => {
    const res = await api.get('/auth/me');
    return res.data.user;
  },
};

export const usersApi = {
  getProfile: async (): Promise<User> => {
    const res = await api.get('/users/profile');
    return res.data;
  },
  updateProfile: async (payload: {
    name?: string;
    phone?: string;
    university?: string;
    department?: string;
    citizenId?: string;
  }): Promise<User> => {
    const res = await api.patch('/users/profile', payload);
    return res.data;
  },
  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    const res = await api.post('/users/change-password', { currentPassword, newPassword });
    return res.data;
  },
  listRegistrations: async (status = 'PENDING_APPROVAL'): Promise<User[]> => {
    const res = await api.get('/users/admin/registrations', { params: { status } });
    return res.data;
  },
  approveRegistration: async (id: string): Promise<{ message: string; user: User }> => {
    const res = await api.post(`/users/admin/registrations/${id}/approve`);
    return res.data;
  },
  rejectRegistration: async (id: string, reason: string): Promise<{ message: string; user: User }> => {
    const res = await api.post(`/users/admin/registrations/${id}/reject`, { reason });
    return res.data;
  },
  listAccounts: async (params: { q?: string; role?: UserRole | 'ALL'; status?: AccountStatus | 'ALL' }): Promise<User[]> => {
    const res = await api.get('/users/admin/accounts', { params });
    return res.data;
  },
  getAccountHistory: async (id: string): Promise<{
    user: User;
    bookings: Booking[];
    rentals: Rental[];
    chargingSessions: ChargingSession[];
    parkingBookings: ParkingBooking[];
  }> => {
    const res = await api.get(`/users/admin/accounts/${id}/history`);
    return res.data;
  },
  lockAccount: async (id: string, reason?: string): Promise<{ message: string; user: User }> => {
    const res = await api.post(`/users/admin/accounts/${id}/lock`, { reason });
    return res.data;
  },
  unlockAccount: async (id: string): Promise<{ message: string; user: User }> => {
    const res = await api.post(`/users/admin/accounts/${id}/unlock`);
    return res.data;
  },
  deleteAccount: async (id: string): Promise<{ message: string }> => {
    const res = await api.delete(`/users/admin/accounts/${id}`);
    return res.data;
  },
  listAuditLogs: async (params: { category?: AuditCategory | 'ALL'; q?: string; format?: string }): Promise<{
    logs?: AuditLogEntry[];
    csv?: string;
    total?: number;
    summary?: {
      totalLogs: number;
      todayActions: number;
      securityWarnings: number;
      onlineAdmins: number;
    };
  }> => {
    const res = await api.get('/users/admin/audit-logs', { params });
    return res.data;
  },
};

export const hubsApi = {
  getAll: async (params?: {
    q?: string;
    lat?: number;
    lng?: number;
    radiusKm?: number;
    hasAvailableVehicles?: boolean;
    hasAvailableDocks?: boolean;
    hasAvailableCharging?: boolean;
  }): Promise<Hub[]> => {
    const res = await api.get('/hubs', { params });
    return res.data;
  },
  getOne: async (id: string): Promise<Hub> => {
    const res = await api.get(`/hubs/${id}`);
    return res.data;
  },
};

export const bookingsApi = {
  create: async (payload: {
    hubId: string;
    vehicleId?: string;
    vehicleType?: string;
    fastReserve?: boolean;
  }): Promise<Booking> => {
    const res = await api.post('/bookings', payload);
    return res.data;
  },
  createParking: async (payload: {
    hubId: string;
    vehiclePlate: string;
    arrivalTime?: string;
  }): Promise<ParkingBooking> => {
    const res = await api.post('/bookings/parking', payload);
    return res.data;
  },
  getActive: async (): Promise<ActiveBookingsBundle> => {
    const res = await api.get('/bookings/active');
    return res.data;
  },
  cancel: async (bookingId: string): Promise<{ message: string }> => {
    const res = await api.post(`/bookings/${bookingId}/cancel`);
    return res.data;
  },
};

export const rentalsApi = {
  pickup: async (payload: { bookingId?: string; vehicleId?: string; qrCode?: string }): Promise<Rental> => {
    const res = await api.post('/rentals/pickup', payload);
    return res.data;
  },
  getActive: async (): Promise<Rental | null> => {
    const res = await api.get('/rentals/active');
    return res.data || null;
  },
  getHistory: async (): Promise<Rental[]> => {
    const res = await api.get('/rentals/history');
    return res.data;
  },
  returnVehicle: async (payload: {
    rentalId?: string;
    destinationHubId: string;
    damagedReported?: boolean;
    damageNote?: string;
  }): Promise<ReturnReceiptResponse> => {
    const res = await api.post('/rentals/return', payload);
    return res.data;
  },
};

export const chargingApi = {
  listPrivateVehicles: async (): Promise<PrivateVehicle[]> => {
    const res = await api.get('/charging/private-vehicles');
    return res.data;
  },
  registerPrivateVehicle: async (payload: {
    plateNumber: string;
    model: string;
    vehicleType: string;
    chargerType: string;
    batteryCapacityKwh: number;
  }): Promise<PrivateVehicle> => {
    const res = await api.post('/charging/private-vehicles', payload);
    return res.data;
  },
  listPoints: async (hubId?: string): Promise<ChargingPoint[]> => {
    const res = await api.get('/charging/points', { params: hubId ? { hubId } : undefined });
    return res.data;
  },
  proposeSlots: async (payload: {
    hubId: string;
    privateVehicleId?: string;
    startTime: string;
    currentSoc: number;
    targetSoc: number;
  }): Promise<{ hubId: string; proposals: ChargingSlotProposal[] }> => {
    const res = await api.post('/charging/slots/propose', payload);
    return res.data;
  },
  bookPrivateSlot: async (payload: {
    hubId: string;
    privateVehicleId: string;
    chargingPointId: string;
    date?: string;
    startTime: string;
    endTime: string;
    currentSoc: number;
    targetSoc: number;
  }): Promise<ChargingSession> => {
    const res = await api.post('/charging/bookings', payload);
    return res.data;
  },
  listSessions: async (params?: { hubId?: string; onlyMine?: boolean }): Promise<ChargingSession[]> => {
    const res = await api.get('/charging/bookings', {
      params: {
        hubId: params?.hubId,
        onlyMine: params?.onlyMine ? 'true' : undefined,
      },
    });
    return res.data;
  },
  cancelSession: async (id: string): Promise<ChargingSession> => {
    const res = await api.post(`/charging/bookings/${id}/cancel`);
    return res.data;
  },
  getPriorityPlan: async (hubId: string, excludePortIds: string[] = []): Promise<{
    hubId: string;
    chargingPoints: ChargingPoint[];
    proposedPlan: GreedyScheduleItem[];
  }> => {
    const res = await api.get('/charging/priority-list', {
      params: {
        hubId,
        excludePortIds: excludePortIds.join(','),
      },
    });
    return res.data;
  },
  applySmartSchedule: async (payload: {
    hubId: string;
    excludedPortIds: string[];
    departureOverrides?: Record<string, string>;
  }): Promise<{ message: string; appliedSessions: ChargingSession[] }> => {
    const res = await api.post('/charging/schedule/apply', payload);
    return res.data;
  },
};

export const dispatchApi = {
  list: async (): Promise<DispatchOrder[]> => {
    const res = await api.get('/dispatch');
    return res.data;
  },
  create: async (payload: {
    sourceHubId: string;
    targetHubId: string;
    vehicleIds: string[];
    note?: string;
  }): Promise<DispatchOrder> => {
    const res = await api.post('/dispatch', payload);
    return res.data;
  },
  complete: async (id: string): Promise<DispatchOrder> => {
    const res = await api.post(`/dispatch/${id}/complete`);
    return res.data;
  },
  cancel: async (id: string): Promise<DispatchOrder> => {
    const res = await api.post(`/dispatch/${id}/cancel`);
    return res.data;
  },
};

export const incidentsApi = {
  list: async (status = 'ALL'): Promise<IncidentReport[]> => {
    const res = await api.get('/incidents', { params: { status } });
    return res.data;
  },
  report: async (payload: {
    hubId: string;
    resourceType: 'VEHICLE' | 'CHARGING_POINT';
    resourceId: string;
    incidentType: string;
    description: string;
  }): Promise<IncidentReport> => {
    const res = await api.post('/incidents', payload);
    return res.data;
  },
  resolve: async (id: string): Promise<IncidentReport> => {
    const res = await api.post(`/incidents/${id}/resolve`);
    return res.data;
  },
};

export const monitoringApi = {
  getStats: async (): Promise<MonitoringStats> => {
    const res = await api.get('/monitoring/stats');
    return res.data;
  },
  getAlerts: async (): Promise<HubAlert[]> => {
    const res = await api.get('/monitoring/alerts');
    return res.data;
  },
};

export const simulationApi = {
  getScenarios: async (): Promise<Scenario[]> => {
    const res = await api.get('/simulation/scenarios');
    return res.data;
  },
  getStatus: async (): Promise<SimulationStatus> => {
    const res = await api.get('/simulation/status');
    return res.data;
  },
  start: async (scenarioId: string, speed = 1, passengerMultiplier = 1): Promise<SimulationStatus> => {
    const res = await api.post('/simulation/start', { scenarioId, speed, passengerMultiplier });
    return res.data;
  },
  pause: async (): Promise<SimulationStatus> => {
    const res = await api.post('/simulation/pause');
    return res.data;
  },
  reset: async (): Promise<SimulationStatus> => {
    const res = await api.post('/simulation/reset');
    return res.data;
  },
};

export const resetApi = {
  resetData: async (): Promise<void> => {
    await api.post('/reset-data');
  },
};

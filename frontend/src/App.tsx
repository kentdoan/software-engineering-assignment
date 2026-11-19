import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  ArrowRightLeft,
  BatteryCharging,
  Compass,
  FileText,
  FlaskConical,
  QrCode,
  Route,
  UserCheck,
  UserCog,
  Users,
  Wrench,
} from 'lucide-react';
import { AdminAccountsView } from './components/admin/AdminAccountsView';
import { AdminAuditLogsView } from './components/admin/AdminAuditLogsView';
import { AdminRegistrationsView } from './components/admin/AdminRegistrationsView';
import { AuthView } from './components/auth/AuthView';
import { ProfileView } from './components/common/ProfileView';
import { NavItemConfig, PortalShell } from './components/layout/PortalShell';
import { OperatorChargingView } from './components/operator/OperatorChargingView';
import { OperatorDispatchView } from './components/operator/OperatorDispatchView';
import { OperatorIncidentsView } from './components/operator/OperatorIncidentsView';
import { OperatorMonitorView } from './components/operator/OperatorMonitorView';
import { OperatorSimulationView } from './components/operator/OperatorSimulationView';
import { StudentChargingView } from './components/student/StudentChargingView';
import { StudentHubExplorer } from './components/student/StudentHubExplorer';
import { StudentPickupView } from './components/student/StudentPickupView';
import { StudentReturnTripView } from './components/student/StudentReturnTripView';
import {
  authApi,
  bookingsApi,
  getAuthToken,
  getErrorMessage,
  rentalsApi,
  resetApi,
  setAuthToken,
  usersApi,
} from './services/api';
import { ActiveBookingsBundle, Rental, ToastMessage, User } from './types';

function defaultTabForRole(role: User['role']): string {
  if (role === 'OPERATOR') return 'opr-monitor';
  if (role === 'ADMIN') return 'adm-registrations';
  return 'stu-explore';
}

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);
  const [activeTab, setActiveTab] = useState('stu-explore');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Student live booking & rental state
  const [bookingsBundle, setBookingsBundle] = useState<ActiveBookingsBundle | null>(null);
  const [activeRental, setActiveRental] = useState<Rental | null>(null);

  // Operator dispatch shortcut from alert
  const [dispatchTargetHubId, setDispatchTargetHubId] = useState<string | undefined>(undefined);

  // Admin pending count badge
  const [pendingOperatorsCount, setPendingOperatorsCount] = useState(0);

  const notify = useCallback(
    (type: ToastMessage['type'], message: string) => {
      const id = `toast-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      setToasts((prev) => [...prev.slice(-3), { id, type, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    [],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshStudentSession = useCallback(async () => {
    if (!user || user.role !== 'STUDENT') return;
    try {
      const [bundle, rental, freshProfile] = await Promise.all([
        bookingsApi.getActive(),
        rentalsApi.getActive(),
        usersApi.getProfile(),
      ]);
      setBookingsBundle(bundle);
      setActiveRental(rental);
      setUser(freshProfile);
    } catch {
      // Ignore silent refresh error
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setBooting(false);
      return;
    }
    authApi
      .me()
      .then((u) => {
        setUser(u);
        setActiveTab(defaultTabForRole(u.role));
      })
      .catch(() => {
        setAuthToken(null);
      })
      .finally(() => setBooting(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'STUDENT') {
      void refreshStudentSession();
      const timer = setInterval(() => void refreshStudentSession(), 10000);
      return () => clearInterval(timer);
    }
    if (user.role === 'ADMIN') {
      usersApi
        .listRegistrations('PENDING_APPROVAL')
        .then((list) => setPendingOperatorsCount(list.length))
        .catch(() => {});
    }
  }, [user?.id, user?.role, refreshStudentSession]);

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    setActiveTab(defaultTabForRole(loggedInUser.role));
    notify('success', `Chào mừng ${loggedInUser.name} đã đăng nhập hệ thống.`);
  };

  const handleLogout = async () => {
    await authApi.logout();
    setUser(null);
    setBookingsBundle(null);
    setActiveRental(null);
    notify('info', 'Đã đăng xuất khỏi hệ thống an toàn.');
  };

  const handleResetDemoData = async () => {
    try {
      await resetApi.resetData();
      notify('success', 'Đã khôi phục toàn bộ dữ liệu mẫu ban đầu của 6 trạm ĐHQG-HCM.');
      if (user?.role === 'STUDENT') {
        await refreshStudentSession();
      } else if (user?.role === 'ADMIN') {
        const list = await usersApi.listRegistrations('PENDING_APPROVAL');
        setPendingOperatorsCount(list.length);
      }
      const prevTab = activeTab;
      setActiveTab('profile');
      setTimeout(() => setActiveTab(prevTab), 10);
    } catch (err) {
      notify('error', getErrorMessage(err));
    }
  };

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f9fa] text-sm font-medium text-[#59645e]">
        Đang khởi tạo Smart E-Mobility Hub...
      </div>
    );
  }

  if (!user) {
    return <AuthView onLoginSuccess={handleLoginSuccess} />;
  }

  const getNavItems = (): NavItemConfig[] => {
    if (user.role === 'STUDENT') {
      const activeBookingsCount =
        (bookingsBundle?.vehicleBooking ? 1 : 0) + (bookingsBundle?.parkingBooking ? 1 : 0);
      return [
        {
          id: 'stu-explore',
          label: 'Khám phá & Đặt xe',
          shortLabel: 'Khám phá',
          icon: <Compass className="h-5 w-5" />,
        },
        {
          id: 'stu-pickup',
          label: 'Nhận xe & QR',
          shortLabel: 'Nhận QR',
          badgeCount: bookingsBundle?.vehicleBooking ? 1 : undefined,
          icon: <QrCode className="h-5 w-5" />,
        },
        {
          id: 'stu-trip',
          label: 'Chuyến đi & Đổi/Hủy',
          shortLabel: 'Chuyến đi',
          badgeCount: activeRental ? 1 : activeBookingsCount || undefined,
          icon: <Route className="h-5 w-5" />,
        },
        {
          id: 'stu-charging',
          label: 'Sạc xe cá nhân',
          shortLabel: 'Sạc xe',
          icon: <BatteryCharging className="h-5 w-5" />,
        },
        {
          id: 'profile',
          label: 'Hồ sơ cá nhân',
          shortLabel: 'Hồ sơ',
          icon: <UserCog className="h-5 w-5" />,
        },
      ];
    }

    if (user.role === 'OPERATOR') {
      return [
        {
          id: 'opr-monitor',
          label: 'Giám sát Mạng lưới',
          shortLabel: 'Giám sát',
          icon: <Activity className="h-5 w-5" />,
        },
        {
          id: 'opr-dispatch',
          label: 'Điều phối Xe',
          shortLabel: 'Điều phối',
          icon: <ArrowRightLeft className="h-5 w-5" />,
        },
        {
          id: 'opr-incidents',
          label: 'Sự cố & Bảo trì',
          shortLabel: 'Sự cố',
          icon: <Wrench className="h-5 w-5" />,
        },
        {
          id: 'opr-charging',
          label: 'Lập lịch Sạc',
          shortLabel: 'Lập lịch',
          icon: <BatteryCharging className="h-5 w-5" />,
        },
        {
          id: 'opr-simulation',
          label: 'Mô phỏng What-If',
          shortLabel: 'What-If',
          icon: <FlaskConical className="h-5 w-5" />,
        },
      ];
    }

    return [
      {
        id: 'adm-registrations',
        label: 'Duyệt Điều phối viên',
        shortLabel: 'Duyệt ĐPV',
        badgeCount: pendingOperatorsCount || undefined,
        icon: <UserCheck className="h-5 w-5" />,
      },
      {
        id: 'adm-accounts',
        label: 'Quản lý Tài khoản',
        shortLabel: 'Tài khoản',
        icon: <Users className="h-5 w-5" />,
      },
      {
        id: 'adm-audit',
        label: 'Nhật ký Hệ thống',
        shortLabel: 'Nhật ký',
        icon: <FileText className="h-5 w-5" />,
      },
      {
        id: 'profile',
        label: 'Hồ sơ Quản trị',
        shortLabel: 'Hồ sơ',
        icon: <UserCog className="h-5 w-5" />,
      },
    ];
  };

  const renderContent = () => {
    if (activeTab === 'profile') {
      return <ProfileView user={user} onUserUpdated={setUser} notify={notify} />;
    }

    if (user.role === 'STUDENT') {
      switch (activeTab) {
        case 'stu-explore':
          return <StudentHubExplorer onBooked={refreshStudentSession} notify={notify} />;
        case 'stu-pickup':
          return (
            <StudentPickupView
              activeBooking={bookingsBundle?.vehicleBooking || null}
              activeRental={activeRental}
              onPickupComplete={async () => {
                await refreshStudentSession();
                setActiveTab('stu-trip');
              }}
              notify={notify}
            />
          );
        case 'stu-trip':
          return (
            <StudentReturnTripView
              activeBooking={bookingsBundle?.vehicleBooking || null}
              activeParkingBooking={bookingsBundle?.parkingBooking || null}
              activeRental={activeRental}
              onUpdated={refreshStudentSession}
              notify={notify}
            />
          );
        case 'stu-charging':
          return <StudentChargingView notify={notify} />;
      }
    }

    if (user.role === 'OPERATOR') {
      switch (activeTab) {
        case 'opr-monitor':
          return (
            <OperatorMonitorView
              onGoToDispatch={(targetHubId) => {
                setDispatchTargetHubId(targetHubId);
                setActiveTab('opr-dispatch');
              }}
              notify={notify}
            />
          );
        case 'opr-dispatch':
          return <OperatorDispatchView initialTargetHubId={dispatchTargetHubId} notify={notify} />;
        case 'opr-incidents':
          return <OperatorIncidentsView notify={notify} />;
        case 'opr-charging':
          return <OperatorChargingView notify={notify} />;
        case 'opr-simulation':
          return <OperatorSimulationView notify={notify} />;
      }
    }

    if (user.role === 'ADMIN') {
      switch (activeTab) {
        case 'adm-registrations':
          return (
            <AdminRegistrationsView
              onPendingCountChange={setPendingOperatorsCount}
              notify={notify}
            />
          );
        case 'adm-accounts':
          return <AdminAccountsView currentAdminId={user.id} notify={notify} />;
        case 'adm-audit':
          return <AdminAuditLogsView notify={notify} />;
      }
    }

    return null;
  };

  return (
    <PortalShell
      user={user}
      navItems={getNavItems()}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      onLogout={handleLogout}
      onResetDemoData={handleResetDemoData}
      toasts={toasts}
      onDismissToast={dismissToast}
    >
      {renderContent()}
    </PortalShell>
  );
}

export default App;

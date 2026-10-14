import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { VerifyEmailPage } from '../pages/VerifyEmailPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';
import { ProtectedRoute } from './ProtectedRoute';
import { AppLayout } from '../components/layout/AppLayout';
import { FeatureProtectedRoute } from './FeatureProtectedRoute';
import { ROUTE_PERMISSIONS } from '../config/permissions';

// Lazy load semua halaman setelah login
const DashboardPage = lazy(() => import('../pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ForceChangePasswordPage = lazy(() => import('../pages/ForceChangePasswordPage').then(m => ({ default: m.ForceChangePasswordPage })));
const NotificationPage = lazy(() => import('../pages/NotificationPage').then(m => ({ default: m.NotificationPage })));
const EmployeePage = lazy(() => import('../pages/EmployeePage').then(m => ({ default: m.EmployeePage })));
const EmployeeCreatePage = lazy(() => import('../pages/EmployeeCreatePage').then(m => ({ default: m.EmployeeCreatePage })));
const EmployeeImportCsvPage = lazy(() => import('../pages/EmployeeImportCsvPage').then(m => ({ default: m.EmployeeImportCsvPage })));
const LeavePage = lazy(() => import('../pages/LeavePage').then(m => ({ default: m.LeavePage })));
const DepartmentPage = lazy(() => import('../pages/DepartmentPage').then(m => ({ default: m.DepartmentPage })));
const PositionPage = lazy(() => import('../pages/PositionPage').then(m => ({ default: m.PositionPage })));
const ApprovalPage = lazy(() => import('../pages/ApprovalPage').then(m => ({ default: m.ApprovalPage })));
const LeaveManagementPage = lazy(() => import('../pages/LeaveManagementPage').then(m => ({ default: m.LeaveManagementPage })));
const LeaveTypePage = lazy(() => import('../pages/LeaveTypePage').then(m => ({ default: m.LeaveTypePage })));
const HolidayPage = lazy(() => import('../pages/HolidayPage').then(m => ({ default: m.HolidayPage })));
const BalanceAdjustmentPage = lazy(() => import('../pages/BalanceAdjustmentPage').then(m => ({ default: m.BalanceAdjustmentPage })));
const ProfileEditPage = lazy(() => import('../pages/ProfileEditPage').then(m => ({ default: m.ProfileEditPage })));
const FeatureManagementPage = lazy(() => import('../pages/FeatureManagementPage').then(m => ({ default: m.FeatureManagementPage })));
const WorkScheduleManagementPage = lazy(() => import('../pages/WorkScheduleManagementPage').then(m => ({ default: m.WorkScheduleManagementPage })));
const AttendancePage = lazy(() => import('../pages/AttendancePage').then(m => ({ default: m.AttendancePage })));
const AllAttendancesPage = lazy(() => import('../pages/AllAttendancesPage').then(m => ({ default: m.AllAttendancesPage })));
const TeamAttendancePage = lazy(() => import('../pages/TeamAttendancePage').then(m => ({ default: m.TeamAttendancePage })));
const AttendanceEventsLogPage = lazy(() => import('../pages/AttendanceEventsLogPage').then(m => ({ default: m.AttendanceEventsLogPage })));
const ActivityLogPage = lazy(() => import('../pages/ActivityLogPage').then(m => ({ default: m.ActivityLogPage })));
const ApiDocsPage = lazy(() => import('../pages/ApiDocsPage'));

function PageLoader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '300px', width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: '#64748b', fontSize: '14px' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#1a78d7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span>Memuat halaman...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

export function AppRoutes() {
  return (
    <AppLayout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Rute Publik (Eager) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Semua rute di bawah ini wajib login (Lazy Loaded) */}
          <Route element={<ProtectedRoute />}>
            
            <Route path="/force-change-password" element={<ForceChangePasswordPage />} />
            <Route path="/notifications" element={<NotificationPage />} />

            <Route element={<FeatureProtectedRoute rule={ROUTE_PERMISSIONS['/dashboard']} />}>
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>

            <Route element={<FeatureProtectedRoute rule={ROUTE_PERMISSIONS['/employee']} />}>
              <Route path="/employee" element={<EmployeePage />} />
            </Route>
            
            <Route element={<FeatureProtectedRoute rule={ROUTE_PERMISSIONS['/employee/create']} />}>
              <Route path="/employee/create" element={<EmployeeCreatePage />} />
            </Route>
            
            <Route element={<FeatureProtectedRoute rule={ROUTE_PERMISSIONS['/employee/import-csv']} />}>
              <Route path="/employee/import-csv" element={<EmployeeImportCsvPage />} />
            </Route>

            <Route element={<FeatureProtectedRoute rule={ROUTE_PERMISSIONS['/department']} />}>
              <Route path="/department" element={<DepartmentPage />} />
            </Route>

            <Route element={<FeatureProtectedRoute rule={ROUTE_PERMISSIONS['/position']} />}>
              <Route path="/position" element={<PositionPage />} />
            </Route>

            <Route element={<FeatureProtectedRoute rule={ROUTE_PERMISSIONS['/approval']} />}>
              <Route path="/approval" element={<ApprovalPage />} />
            </Route>

            <Route element={<FeatureProtectedRoute rule={ROUTE_PERMISSIONS['/leave-management']} />}>
              <Route path="/leave-management" element={<LeaveManagementPage />} />
            </Route>

            <Route element={<FeatureProtectedRoute rule={ROUTE_PERMISSIONS['/leave-types']} />}>
              <Route path="/leave-types" element={<LeaveTypePage />} />
            </Route>

            <Route element={<FeatureProtectedRoute rule={ROUTE_PERMISSIONS['/holidays']} />}>
              <Route path="/holidays" element={<HolidayPage />} />
            </Route>

            <Route element={<FeatureProtectedRoute rule={ROUTE_PERMISSIONS['/balance-adjustments']} />}>
              <Route path="/balance-adjustments" element={<BalanceAdjustmentPage />} />
            </Route>

            <Route element={<FeatureProtectedRoute rule={ROUTE_PERMISSIONS['/leave']} />}>
              <Route path="/leave" element={<LeavePage />} />
            </Route>

            <Route element={<FeatureProtectedRoute rule={ROUTE_PERMISSIONS['/profile']} />}>
              <Route path="/profile" element={<ProfileEditPage />} />
            </Route>
            
            <Route element={<FeatureProtectedRoute rule={ROUTE_PERMISSIONS['/features']} />}>
              <Route path="/features" element={<FeatureManagementPage />} />
            </Route>
            
            {/* Work Schedules */}
            <Route element={<FeatureProtectedRoute rule={ROUTE_PERMISSIONS['/work-schedules']} />}>
              <Route path="/work-schedules" element={<WorkScheduleManagementPage />} />
            </Route>

            {/* Attendance */}
            <Route element={<FeatureProtectedRoute rule={ROUTE_PERMISSIONS['/attendance']} />}>
              <Route path="/attendance" element={<AttendancePage />} />
            </Route>
            
            <Route element={<FeatureProtectedRoute rule={ROUTE_PERMISSIONS['/attendance/all']} />}>
              <Route path="/attendance/all" element={<AllAttendancesPage />} />
            </Route>
            
            <Route element={<FeatureProtectedRoute rule={ROUTE_PERMISSIONS['/attendance/team']} />}>
              <Route path="/attendance/team" element={<TeamAttendancePage />} />
            </Route>
            
            <Route element={<FeatureProtectedRoute rule={ROUTE_PERMISSIONS['/attendance/events']} />}>
              <Route path="/attendance/events" element={<AttendanceEventsLogPage />} />
            </Route>

            <Route element={<FeatureProtectedRoute rule={ROUTE_PERMISSIONS['/activity-logs']} />}>
              <Route path="/activity-logs" element={<ActivityLogPage />} />
            </Route>

            <Route element={<FeatureProtectedRoute rule={ROUTE_PERMISSIONS['/api-docs']} />}>
              <Route path="/api-docs" element={<ApiDocsPage />} />
            </Route>

          </Route>

          {/* Fallback ke login jika rute tidak ditemukan */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Suspense>
    </AppLayout>
  );
}

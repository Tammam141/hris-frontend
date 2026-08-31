import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { VerifyEmailPage } from '../pages/VerifyEmailPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ForceChangePasswordPage } from '../pages/ForceChangePasswordPage';
import { ProtectedRoute } from './ProtectedRoute';
import { AppLayout } from '../components/layout/AppLayout';
import { EmployeePage } from '../pages/EmployeePage';
import { EmployeeCreatePage } from '../pages/EmployeeCreatePage';
import { LeavePage } from '../pages/LeavePage';
import { DepartmentPage } from '../pages/DepartmentPage';
import { PositionPage } from '../pages/PositionPage';
import { ApprovalPage } from '../pages/ApprovalPage';
import { LeaveManagementPage } from '../pages/LeaveManagementPage';
import { LeaveTypePage } from '../pages/LeaveTypePage';
import { HolidayPage } from '../pages/HolidayPage';
import { BalanceAdjustmentPage } from '../pages/BalanceAdjustmentPage';
import { ProfileEditPage } from '../pages/ProfileEditPage';
import { FeatureManagementPage } from '../pages/FeatureManagementPage';

// New Modules
import { WorkScheduleManagementPage } from '../pages/WorkScheduleManagementPage';
import { AttendancePage } from '../pages/AttendancePage';
import { AllAttendancesPage } from '../pages/AllAttendancesPage';
import { AttendanceEventsLogPage } from '../pages/AttendanceEventsLogPage';

// Feature-based AC
import { FeatureProtectedRoute } from './FeatureProtectedRoute';
import { ROUTE_PERMISSIONS } from '../config/permissions';

export function AppRoutes() {
  return (
    <AppLayout>
      <Routes>
        {/* Rute Publik */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Semua rute di bawah ini wajib login */}
        <Route element={<ProtectedRoute />}>
          
          <Route path="/force-change-password" element={<ForceChangePasswordPage />} />

          <Route element={<FeatureProtectedRoute rule={ROUTE_PERMISSIONS['/dashboard']} />}>
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>

          <Route element={<FeatureProtectedRoute rule={ROUTE_PERMISSIONS['/employee']} />}>
            <Route path="/employee" element={<EmployeePage />} />
            <Route path="/employee/create" element={<EmployeeCreatePage />} />
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
          
          <Route element={<FeatureProtectedRoute rule={{ required: true, features: ['attendance.report'] }} />}>
            <Route path="/attendance/events" element={<AttendanceEventsLogPage />} />
          </Route>

        </Route>

        {/* Fallback ke login jika rute tidak ditemukan */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </AppLayout>
  );
}

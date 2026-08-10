import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ProtectedRoute } from './ProtectedRoute';
import { AppLayout } from '../components/layout/AppLayout';
import { EmployeePage } from '../pages/EmployeePage';
import { LeavePage } from '../pages/LeavePage';
import { DepartmentPage } from '../pages/DepartmentPage';
import { PositionPage } from '../pages/PositionPage';
import { ApprovalPage } from '../pages/ApprovalPage';

export function AppRoutes() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/employee" element={<EmployeePage />} />
          <Route path="/department" element={<DepartmentPage />} />
          <Route path="/position" element={<PositionPage />} />
          <Route path="/approval" element={<ApprovalPage />} />
          <Route path="/leave" element={<LeavePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </AppLayout>
  );
}

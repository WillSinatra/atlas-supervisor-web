import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import DashboardLayout from '@/shared/layouts/DashboardLayout';
import AuthLayout from '@/shared/layouts/AuthLayout';
import ProtectedRoute from '@/shared/components/ProtectedRoute';

const LoginPage = lazy(() => import('@/modules/auth/pages/LoginPage'));
const DashboardPage = lazy(() => import('@/modules/dashboard/pages/DashboardPage'));

const OrdersPlaceholder = lazy(() => import('@/modules/orders/pages/OrdersPage'));
const OrderDetailPage = lazy(() => import('@/modules/orders/pages/OrderDetailPage'));
const NuevaOrdenPage = lazy(() => import('@/modules/orders/pages/NuevaOrdenPage'));
const CrewsPlaceholder = lazy(() => import('@/modules/crews/pages/CrewsPage'));
const CrewDetailPage = lazy(() => import('@/modules/crews/pages/CrewDetailPage'));
const CustomersPlaceholder = lazy(() => import('@/modules/customers/pages/CustomersPage'));
const CustomerDetailPage = lazy(() => import('@/modules/customers/pages/CustomerDetailPage'));
const ReportsPlaceholder = lazy(() => import('@/modules/reports/pages/ReportsPage'));
const SettingsPlaceholder = lazy(() => import('@/modules/settings/pages/SettingsPage'));

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <AuthLayout />,
    children: [
      {
        index: true,
        element: <LoginPage />,
      },
    ],
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'orders',
        element: <OrdersPlaceholder />,
      },
      {
        path: 'orders/nueva',
        element: <NuevaOrdenPage />,
      },
      {
        path: 'orders/:id',
        element: <OrderDetailPage />,
      },
      {
        path: 'crews',
        element: <CrewsPlaceholder />,
      },
      {
        path: 'crews/:id',
        element: <CrewDetailPage />,
      },
      {
        path: 'customers',
        element: <CustomersPlaceholder />,
      },
      {
        path: 'customers/:id',
        element: <CustomerDetailPage />,
      },
      {
        path: 'reports',
        element: <ReportsPlaceholder />,
      },
      {
        path: 'settings',
        element: <SettingsPlaceholder />,
      },
    ],
  },
]);
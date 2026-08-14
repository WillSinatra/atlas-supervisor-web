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
const TicketsPage = lazy(() => import('@/modules/tickets/pages/TicketsPage'));
// Módulo nuevo de tickets. Convive con el anterior hasta reemplazarlo.
const SoportePage = lazy(() => import('@/modules/tickets/pages/SoportePage'));
const TareasPage = lazy(() => import('@/modules/tareas/pages/TareasPage'));
const EmpleadosPage = lazy(() => import('@/modules/empleados/pages/EmpleadosPage'));
const MaterialesPage = lazy(() => import('@/modules/materiales/pages/MaterialesPage'));
const ChecklistsPage = lazy(() => import('@/modules/checklists/pages/ChecklistsPage'));
const RemitoImprimirPage = lazy(() => import('@/modules/materiales/pages/RemitoImprimirPage'));
const PresupuestoImprimirPage = lazy(() => import('@/modules/materiales/pages/PresupuestoImprimirPage'));
const EtiquetasImprimirPage = lazy(() => import('@/modules/materiales/pages/EtiquetasImprimirPage'));

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
    // Fuera del layout: se abre en una pestaña aparte para imprimir o guardar PDF.
    path: '/remitos/:id/imprimir',
    element: (
      <ProtectedRoute>
        <RemitoImprimirPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/presupuestos/:id/imprimir',
    element: (
      <ProtectedRoute>
        <PresupuestoImprimirPage />
      </ProtectedRoute>
    ),
  },
  {
    // Hoja de etiquetas del pañol. Los materiales van en la query (?ids=...)
    // para poder guardar el enlace y reimprimir la misma tanda.
    path: '/materiales/etiquetas',
    element: (
      <ProtectedRoute>
        <EtiquetasImprimirPage />
      </ProtectedRoute>
    ),
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
        path: 'tickets',
        element: <TicketsPage />,
      },
      {
        path: 'soporte',
        element: <SoportePage />,
      },
      {
        path: 'tareas',
        element: <TareasPage />,
      },
      {
        path: 'crews',
        element: <CrewsPlaceholder />,
      },
      {
        path: 'empleados',
        element: <EmpleadosPage />,
      },
      {
        path: 'materiales',
        element: <MaterialesPage />,
      },
      {
        path: 'checklists',
        element: <ChecklistsPage />,
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
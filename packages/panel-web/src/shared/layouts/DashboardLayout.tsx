import { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/shared/contexts/AuthContext';
import { useTheme } from '@/shared/contexts/ThemeContext';
import { cn } from '@/shared/utils/cn';
import { Logo } from '@/shared/components/Logo';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  UserCircle,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  Search,
  Menu,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Home,
  Wifi,
  WifiOff,
  Sun,
  Moon,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Órdenes de Trabajo', href: '/orders', icon: ClipboardList },
  { name: 'Cuadrillas', href: '/crews', icon: Users },
  { name: 'Clientes', href: '/customers', icon: UserCircle },
  { name: 'Reportes', href: '/reports', icon: BarChart3 },
  { name: 'Configuración', href: '/settings', icon: Settings },
];

export default function DashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [backendOnline] = useState(true);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const breadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    return [
      { name: 'Inicio', href: '/dashboard', icon: Home },
      ...paths.map((path, index) => ({
        name: path.charAt(0).toUpperCase() + path.slice(1),
        href: `/${paths.slice(0, index + 1).join('/')}`,
        icon: undefined,
      })),
    ];
  };

  const sidebarWidth = sidebarCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 bg-sidebar flex flex-col border-r border-white/10',
          'transition-all duration-300',
          sidebarCollapsed ? 'w-[--sidebar-collapsed]' : 'w-[--sidebar-width]',
          'lg:translate-x-0 transform',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center gap-3 px-6 h-[--topbar-height] border-b border-white/10">
          <Logo size={sidebarCollapsed ? 'sm' : 'md'} collapsed={sidebarCollapsed} variant="onDark" />
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-custom overflow-x-hidden">
          {navigation.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-150 relative',
                  isActive
                    ? 'text-white bg-sidebar-active/20 border border-sidebar-active/30'
                    : 'text-slate-300 hover:text-white hover:bg-sidebar-hover',
                  sidebarCollapsed && 'justify-center px-2',
                )}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <item.icon className={cn('w-5 h-5 flex-shrink-0', isActive ? 'text-sidebar-active' : 'text-slate-400')} />
                {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-active flex-shrink-0"
                  />
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex w-full items-center justify-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-sidebar-hover rounded-lg transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {!sidebarCollapsed && <span>Colapsar</span>}
          </button>
        </div>

        <div className="p-3 border-t border-white/10">
          <div className={cn('flex items-center gap-3 px-3 py-2', sidebarCollapsed && 'justify-center')}>
            <div className="w-8 h-8 rounded-full bg-atlas-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
              {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : user?.role === 'ADMIN' ? 'Admin' : 'Supervisor'}
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      <div
        className="min-h-screen transition-all duration-300"
        style={{ marginLeft: 'var(--sidebar-width)' }}
      >
        <header className="sticky top-0 z-30 h-[--topbar-height] bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <Menu className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>

            <nav className="hidden sm:flex items-center gap-2 text-sm">
              {breadcrumbs().map((crumb, index, arr) => {
                const CrumbIcon = crumb.icon;
                return (
                  <div key={index} className="flex items-center gap-2">
                    {index > 0 && <span className="text-slate-400">/</span>}
                    <button
                      onClick={() => navigate(crumb.href)}
                      className={cn(
                        'flex items-center gap-1 hover:text-atlas-600 transition-colors',
                        index === arr.length - 1
                          ? 'text-slate-900 dark:text-white font-medium'
                          : 'text-slate-500 dark:text-slate-400',
                      )}
                    >
                      {CrumbIcon && <CrumbIcon className="w-4 h-4" />}
                      <span className="truncate">{crumb.name}</span>
                    </button>
                  </div>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700">
              {backendOnline ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-red-500" />
              )}
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {backendOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title={theme === 'dark' ? 'Cambiar a modo día' : 'Cambiar a modo noche'}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              ) : (
                <Moon className="w-5 h-5 text-slate-600" />
              )}
            </button>

            <div className="hidden lg:block relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar..."
                className="input pl-10 w-64"
              />
            </div>

            <button className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
              <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
            </button>

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <div className="w-8 h-8 rounded-full bg-atlas-600 flex items-center justify-center text-white text-sm font-medium">
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50"
                  >
                    <button
                      onClick={() => { navigate('/settings'); setUserMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <Settings className="w-4 h-4" />
                      Configuración
                    </button>
                    <hr className="border-slate-200 dark:border-slate-700" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <LogOut className="w-4 h-4" />
                      Cerrar sesión
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
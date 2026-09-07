import { Navigate, Outlet, createRootRoute, createRoute, createRouter } from '@tanstack/react-router';

import { useAuth } from './auth/auth-context';
import { AppShell } from './components/app-shell';
import { IncidentsPage } from './pages/incidents-page';
import { LoginPage } from './pages/login-page';
import { ManagementRoutePage } from './pages/management-route-page';
import { PatrolsPage } from './pages/patrols-page';
import { ReportsPage } from './pages/reports-page';
import { ShopsPage } from './pages/shops-page';
import { UsersPage } from './pages/users-page';
import { SetupPage } from './pages/setup-page';
import { AdministrationPage } from './pages/administration-page';

const rootRoute = createRootRoute({ component: () => <Outlet />, validateSearch: (search: Record<string, unknown>): { staff?: string; filters?: string } => ({ staff: typeof search.staff === 'string' ? search.staff : undefined, filters: typeof search.filters === 'string' ? search.filters : undefined }) });

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_protected',
  component: ProtectedLayout,
});

const controlRoute = createRoute({ getParentRoute: () => protectedRoute, id: '_control', component: ControlLayout });

const shopsIndexRoute = createRoute({
  getParentRoute: () => controlRoute,
  path: '/',
  component: ShopsPage,
});

const shopRoute = createRoute({
  getParentRoute: () => controlRoute,
  path: '/shops/$shopId',
  component: ShopRoute,
});

const incidentsRoute = createRoute({
  getParentRoute: () => controlRoute,
  path: '/incidents',
  component: IncidentsPage,
});

const incidentRoute = createRoute({
  getParentRoute: () => incidentsRoute,
  path: '$incidentId',
  component: () => null,
});

const patrolsRoute = createRoute({
  getParentRoute: () => controlRoute,
  path: '/patrols',
  component: PatrolsPage,
});

const patrolRoute = createRoute({
  getParentRoute: () => patrolsRoute,
  path: '$patrolId',
  component: () => null,
});

const reportsRoute = createRoute({
  getParentRoute: () => controlRoute,
  path: '/reports',
  component: ReportsPage,
});

const managementRoute = createRoute({
  getParentRoute: () => controlRoute,
  path: '/management',
  component: ManagementRoutePage,
});

const reportRoute = createRoute({
  getParentRoute: () => reportsRoute,
  path: '$reportId',
  component: () => null,
});

const administrationRoute = createRoute({ getParentRoute: () => controlRoute, path: '/administration', component: AdministrationPage });
const setupRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/setup', component: SetupPage });
const usersRoute = createRoute({ getParentRoute: () => controlRoute, path: '/users', component: UsersPage });

const routeTree = rootRoute.addChildren([
  loginRoute,
  protectedRoute.addChildren([setupRoute, controlRoute.addChildren([
    shopsIndexRoute,
    shopRoute,
    patrolsRoute.addChildren([patrolRoute]),
    incidentsRoute.addChildren([incidentRoute]),
    reportsRoute.addChildren([reportRoute]),
    managementRoute,
    administrationRoute,
    usersRoute,
  ])]),
]);

export const router = createRouter({ routeTree, defaultPreload: 'intent' });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function ProtectedLayout(): React.JSX.Element {
  const { isLoading, profile } = useAuth();
  if (isLoading) return <div className="app-loading">Загрузка сессии</div>;
  if (profile === null) return <Navigate to="/login" replace />;
  return <AppShell />;
}

function ShopRoute(): React.JSX.Element {
  const { shopId } = shopRoute.useParams();
  return <ShopsPage selectedShopId={shopId} />;
}

function ControlLayout(): React.JSX.Element {
  const { profile } = useAuth();
  if (profile?.role !== 'admin' && profile?.role !== 'inspector') return <Navigate to="/setup" replace />;
  return <Outlet />;
}

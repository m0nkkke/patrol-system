import { Navigate, Outlet, createRootRoute, createRoute, createRouter } from '@tanstack/react-router';

import { useAuth } from './auth/auth-context';
import { AppShell } from './components/app-shell';
import { IncidentsPage } from './pages/incidents-page';
import { LoginPage } from './pages/login-page';
import { ManagementRoutePage } from './pages/management-route-page';
import { PatrolsPage } from './pages/patrols-page';
import { ReportsPage } from './pages/reports-page';
import { ShopsPage } from './pages/shops-page';

const rootRoute = createRootRoute({ component: () => <Outlet /> });

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

const shopsIndexRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/',
  component: ShopsPage,
});

const shopRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/shops/$shopId',
  component: ShopRoute,
});

const incidentsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/incidents',
  component: IncidentsPage,
});

const incidentRoute = createRoute({
  getParentRoute: () => incidentsRoute,
  path: '$incidentId',
  component: () => null,
});

const patrolsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/patrols',
  component: PatrolsPage,
});

const patrolRoute = createRoute({
  getParentRoute: () => patrolsRoute,
  path: '$patrolId',
  component: () => null,
});

const reportsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/reports',
  component: ReportsPage,
});

const managementRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/management',
  component: ManagementRoutePage,
});

const reportRoute = createRoute({
  getParentRoute: () => reportsRoute,
  path: '$reportId',
  component: () => null,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  protectedRoute.addChildren([
    shopsIndexRoute,
    shopRoute,
    patrolsRoute.addChildren([patrolRoute]),
    incidentsRoute.addChildren([incidentRoute]),
    reportsRoute.addChildren([reportRoute]),
    managementRoute,
  ]),
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

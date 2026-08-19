import { Navigate } from '@tanstack/react-router';

import { useAuth } from '../auth/auth-context';
import { ManagementPage } from './management-page';

export function ManagementRoutePage(): React.JSX.Element {
  const { profile } = useAuth();
  if (profile?.role !== 'admin') return <Navigate to="/" replace />;
  return <ManagementPage />;
}

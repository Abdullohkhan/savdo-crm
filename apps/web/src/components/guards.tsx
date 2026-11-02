import type { Role } from '@savdo/shared';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAppSelector } from '@/store';

export function RequireAuth({ children }: { children: ReactNode }) {
  const user = useAppSelector((s) => s.auth.user);
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

export function RequireRole({ roles, children }: { roles: readonly Role[]; children: ReactNode }) {
  const role = useAppSelector((s) => s.auth.user?.role);
  if (!role || !roles.includes(role)) return <Navigate to="/forbidden" replace />;
  return children;
}

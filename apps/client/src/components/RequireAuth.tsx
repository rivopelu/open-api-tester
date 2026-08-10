import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export default function RequireAuth() {
  const { user, initializing, init } = useAuthStore();

  // Restore session (validates stored token against the server).
  useEffect(() => {
    init();
  }, [init]);

  // Waiting for session restore to finish.
  if (initializing) {
    return null;
  }

  // Not authenticated → send to sign-in.
  if (!user) {
    return <Navigate to="/auth/sign-in" replace />;
  }

  return <Outlet />;
}
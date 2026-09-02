import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { AssistantDrawer } from './assistant/AssistantDrawer';

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

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-base">
      <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden">
        <Outlet />
      </div>
      <AssistantDrawer />
    </div>
  );
}
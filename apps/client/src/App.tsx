import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useUiStore } from './store/useUiStore';
import { useAuthStore } from './store/useAuthStore';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { RightSidebar } from './components/RightSidebar';
import { DesignerPanel } from './components/designer/DesignerPanel';
import { ApiInfoForm } from './components/designer/ApiInfoForm';
import { ConverterPanel } from './components/converter/ConverterPanel';
import { ComponentsPanel } from './components/components/ComponentsPanel';
import { SecurityPanel } from './components/security/SecurityPanel';
import { PreviewPanel } from './components/preview/PreviewPanel';
import { Dashboard } from './components/Dashboard';

export default function App() {
  const { activePanel } = useUiStore();
  const { user, initializing, init } = useAuthStore();
  const [inDashboard, setInDashboard] = useState(true);

  // Restore session (validates stored token against the server).
  useEffect(() => {
    init();
  }, [init]);

  const renderPanel = () => {
    switch (activePanel) {
      case 'home':
        return (
          <section className="scroll-y flex justify-center px-6 py-6">
            <div className="w-full max-w-[800px]">
              <ApiInfoForm />
            </div>
          </section>
        );
      case 'designer':
        return <DesignerPanel />;
      case 'converter':
        return <ConverterPanel />;
      case 'components':
        return <ComponentsPanel />;
      case 'security':
        return <SecurityPanel />;
      case 'preview':
        return <PreviewPanel />;
      default:
        return <DesignerPanel />;
    }
  };

  // ── Render order ──────────────────────────────────────────────────────────

  // 1. Restoring session
  if (initializing) {
    return null;
  }

  // 2. Must be authenticated first
  if (!user) {
    return <Navigate to="/auth/sign-in" replace />;
  }

  // 3. Dashboard — project picker
  if (inDashboard) {
    return (
      <div className="min-h-screen bg-base">
        <Dashboard onProjectSelect={() => setInDashboard(false)} />
      </div>
    );
  }

  // 4. Main editor
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base">
      <Header onBackToDashboard={() => setInDashboard(true)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex flex-1 flex-col overflow-hidden animate-fadeIn">
          {renderPanel()}
        </main>
        <RightSidebar />
      </div>
    </div>
  );
}

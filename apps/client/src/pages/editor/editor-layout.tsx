import { Outlet } from 'react-router-dom';
import { Header } from '../../components/Header';
import { Sidebar } from '../../components/Sidebar';
import { RightSidebar } from '../../components/RightSidebar';

export default function EditorLayout() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex flex-1 flex-col overflow-hidden animate-fadeIn">
          <Outlet />
        </main>
        <RightSidebar />
      </div>
    </div>
  );
}
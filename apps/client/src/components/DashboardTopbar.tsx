import { ChevronDown, LogOut, User, Upload, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { router } from '../routes';
import { Avatar, Button, Popover, ThemeToggle, Typography } from './ui';
import { EnvironmentSelector } from './EnvironmentSelector';

export interface DashboardTopbarProps {
  onCreateProject: () => void;
  onOpenImport: () => void;
}

/** Top bar for the dashboard shell: brand + actions (left), profile popover (right). */
export function DashboardTopbar({ onCreateProject, onOpenImport }: DashboardTopbarProps) {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();

  const initials = user?.name
    ? user.name.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const openProfileSettings = () => navigate(router.settings.profile());

  return (
    <header className="flex h-[60px] shrink-0 items-center gap-2 border-b border-border bg-surface px-4">
      {/* Brand + actions (left) */}
      <div className="flex items-center gap-2">
        <img
          src="/logo.png"
          alt="Max API Studio logo"
          className="h-8 w-8 rounded-none object-contain"
        />
        <span className="mr-1 hidden text-sm font-bold text-text-primary sm:inline">
          Max API Studio
        </span>
      </div>

      <div className="ml-2 flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onOpenImport}>
          <Upload className="h-3.5 w-3.5" aria-hidden="true" />
          Import YAML
        </Button>
        <Button variant="primary" size="sm" onClick={onCreateProject}>
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          New Project
        </Button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      <ThemeToggle />

      <EnvironmentSelector />

      {/* Profile (right) */}
      <Popover
        trigger={({ open }) => (
          <button
            type="button"
            className={`flex items-center gap-2 rounded-none border px-1.5 py-1 transition-colors ${
              open ? 'border-primary/40 bg-primary/10' : 'border-transparent hover:bg-overlay'
            }`}
          >
            <Avatar
              src={user?.profile_picture}
              alt={user?.name ?? 'Profile'}
              fallback={initials}
              size="sm"
            />
            <span className="hidden max-w-[140px] truncate text-sm font-medium text-text-primary md:inline">
              {user?.name}
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
        )}
        align="end"
        className="w-60"
      >
        {({ close }) => (
          <>
            <div className="border-b border-border px-2.5 pb-2.5 pt-1">
              <Typography variant="body-sm" className="truncate">
                {user?.name ?? 'Signed in'}
              </Typography>
              <Typography tone="muted" variant="caption" className="truncate">
                {user?.email}
              </Typography>
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                close();
                openProfileSettings();
              }}
              className="mt-1 flex w-full items-center gap-2.5 rounded-none px-2.5 py-2 text-sm text-text-primary transition-colors hover:bg-overlay"
            >
              <User className="h-4 w-4 text-text-muted" aria-hidden="true" />
              Profile Settings
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                close();
                signOut();
              }}
              className="flex w-full items-center gap-2.5 rounded-none px-2.5 py-2 text-sm text-danger transition-colors hover:bg-danger/10"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Logout
            </button>
          </>
        )}
      </Popover>
    </header>
  );
}

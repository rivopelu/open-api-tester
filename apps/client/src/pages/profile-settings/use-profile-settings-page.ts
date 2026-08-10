import { useAuthStore } from '../../store/useAuthStore'

export type ProfileSettingsView = {
  title: string
  subtitle: string
  name: string
  email: string
  avatarSrc: string | null
  initials: string
}

/**
 * Backs the Profile Settings page. Reads the signed-in account from the auth
 * store and returns a plain view-model so the page stays presentational
 * (mirrors the `use-*-page` pattern in biwave/fe-biwave).
 */
export default function useProfileSettingsPage(): ProfileSettingsView {
  const { user } = useAuthStore()

  const initials = user?.name
    ? user.name
        .split(/\s+/)
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?'

  return {
    title: 'Profile Settings',
    subtitle: 'Manage your account details',
    name: user?.name ?? 'Signed out',
    email: user?.email ?? '—',
    avatarSrc: user?.profile_picture ?? null,
    initials,
  }
}
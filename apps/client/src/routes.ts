export type EditorPanelId =
  | 'home'
  | 'designer'
  | 'converter'
  | 'schemas'
  | 'security'
  | 'preview'

const EDITOR_BASE = '/editor'

/**
 * Single source of truth for every app URL. Callers must build paths through
 * these accessors (never hand-write string literals) so a URL change is a
 * single edit here — mirroring `routes` in biwave/fe-biwave.
 */
export const router = {
  home: () => '/',
  dashboard: () => '/dashboard',
  auth: {
    signIn: () => '/auth/sign-in',
    callback: () => '/auth',
  },
  editor: {
    /** Editor root -> the `home` panel (API info form). */
    base: () => EDITOR_BASE,
    /** A specific editor panel, e.g. `router.editor.panel('designer')`. */
    panel: (panel: EditorPanelId) =>
      panel === 'home' ? EDITOR_BASE : `${EDITOR_BASE}/${panel}`,
  },
  /**
   * Parameterized accessor example: opens a project in the editor. Reserved
   * for project-scoped URLs — wire the matching `/projects/:id/*` route here
   * when project-scoped routing lands.
   */
  project: (id: string) => `/projects/${id}`,
  lab: {
    base: () => '/lab',
    button: () => '/lab/button',
    card: () => '/lab/card',
    typography: () => '/lab/typography',
    checkbox: () => '/lab/checkbox',
    select: () => '/lab/select',
    input: () => '/lab/input',
    avatar: () => '/lab/avatar',
    spinner: () => '/lab/spinner',
    showcase: () => '/lab/showcase',
  },
} as const
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type {
  ApiSpec, Endpoint, ApiTag, SchemaComponent, SecurityScheme,
} from '@modern-api-studio/types';
import { getErrorMessage, projectApi, SaveConflictError } from '../lib/api';

const DEFAULT_SPEC: ApiSpec = {
  id: uuidv4(),
  info: { title: 'My API', version: '1.0.0', description: 'Built with Max API Studio' },
  servers: [{ url: 'https://api.example.com', description: 'Production' }],
  tags: [
    { id: uuidv4(), name: 'Users', description: 'User operations' },
    { id: uuidv4(), name: 'Products', description: 'Product operations' },
  ],
  endpoints: [
    {
      id: uuidv4(),
      path: '/api/v1/users',
      method: 'GET',
      summary: 'List all users',
      description: 'Returns a paginated list of users',
      operationId: 'listUsers',
      tags: ['Users'],
      deprecated: false,
      security: ['bearerAuth'],
      parameters: [
        { id: uuidv4(), name: 'page', in: 'query', required: false, description: 'Page number', schema: { type: 'integer', example: 1 } },
        { id: uuidv4(), name: 'limit', in: 'query', required: false, description: 'Items per page', schema: { type: 'integer', example: 10 } },
      ],
      responses: [
        { id: uuidv4(), statusCode: '200', description: 'Success', schema: [] },
        { id: uuidv4(), statusCode: '401', description: 'Unauthorized', schema: [] },
      ],
    },
    {
      id: uuidv4(),
      path: '/api/v1/users',
      method: 'POST',
      summary: 'Create user',
      operationId: 'createUser',
      tags: ['Users'],
      deprecated: false,
      security: ['bearerAuth'],
      parameters: [],
      requestBody: {
        required: true,
        contentType: 'application/json',
        schema: [
          { id: uuidv4(), name: 'name', type: 'string', required: true, nullable: false, example: 'John Doe' },
          { id: uuidv4(), name: 'email', type: 'string', required: true, nullable: false, example: 'john@example.com', format: 'email' },
          { id: uuidv4(), name: 'password', type: 'string', required: true, nullable: false, format: 'password' },
        ],
      },
      responses: [
        { id: uuidv4(), statusCode: '201', description: 'Created', schema: [] },
        { id: uuidv4(), statusCode: '400', description: 'Bad Request', schema: [] },
      ],
    },
    {
      id: uuidv4(),
      path: '/api/v1/users/{id}',
      method: 'GET',
      summary: 'Get user by ID',
      operationId: 'getUserById',
      tags: ['Users'],
      deprecated: false,
      security: ['bearerAuth'],
      parameters: [
        { id: uuidv4(), name: 'id', in: 'path', required: true, description: 'User ID', schema: { type: 'string', format: 'uuid' } },
      ],
      responses: [
        { id: uuidv4(), statusCode: '200', description: 'Success', schema: [] },
        { id: uuidv4(), statusCode: '404', description: 'Not Found', schema: [] },
      ],
    },
  ],
  components: {
    schemas: [
      {
        id: uuidv4(),
        name: 'User',
        description: 'User entity',
        properties: [
          { id: uuidv4(), name: 'id', type: 'string', required: true, nullable: false, format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
          { id: uuidv4(), name: 'name', type: 'string', required: true, nullable: false, example: 'John Doe' },
          { id: uuidv4(), name: 'email', type: 'string', required: true, nullable: false, format: 'email', example: 'john@example.com' },
          { id: uuidv4(), name: 'createdAt', type: 'string', required: false, nullable: false, format: 'date-time' },
        ],
      },
    ],
    securitySchemes: [
      { id: uuidv4(), name: 'bearerAuth', type: 'bearer', description: 'JWT Bearer token', bearerFormat: 'JWT' },
      { id: uuidv4(), name: 'apiKeyAuth', type: 'apiKey', description: 'API Key', in: 'header', keyName: 'x-api-key' },
    ],
  },
  globalSecurity: ['bearerAuth'],
  openApiVersion: 'openapi3',
};

interface HistoryEntry {
  spec: ApiSpec;
  timestamp: number;
}

interface ApiSpecStore {
  spec: ApiSpec;
  activeEndpointId: string | null;
  history: HistoryEntry[];
  historyIndex: number;
  searchQuery: string;
  filterTag: string | null;
  activeProjectId: string | null;
  /** ISO timestamp of when the current project was last loaded/saved (server value). Used for optimistic locking. */
  localUpdatedAt: string | null;
  /** ISO timestamp when we last successfully saved to the server. */
  lastSavedAt: string | null;

  loadProject: (id: string) => Promise<void>;
  createNewProject: (name: string) => Promise<boolean>;
  importProject: (name: string, spec: ApiSpec) => Promise<boolean>;
  saveProject: (forceOverwrite?: boolean) => Promise<void>;
  deleteProject: (id: string) => Promise<boolean>;
  renameProject: (id: string, name: string) => Promise<boolean>;

  // Spec-level actions
  setSpec: (spec: ApiSpec) => void;
  updateInfo: (info: Partial<ApiSpec['info']>) => void;
  setOpenApiVersion: (v: ApiSpec['openApiVersion']) => void;
  setGlobalSecurity: (schemes: string[]) => void;

  // Endpoint actions
  setActiveEndpoint: (id: string | null) => void;
  addEndpoint: (ep?: Partial<Endpoint>) => void;
  updateEndpoint: (id: string, changes: Partial<Endpoint>) => void;
  duplicateEndpoint: (id: string) => void;
  deleteEndpoint: (id: string) => void;
  clearEndpoints: () => void;
  reorderEndpoints: (from: number, to: number) => void;

  // Tag actions
  addTag: (tag: Partial<ApiTag>) => void;
  updateTag: (id: string, changes: Partial<ApiTag>) => void;
  deleteTag: (id: string) => void;

  // Schema component actions
  addSchema: (s: Partial<SchemaComponent>) => void;
  updateSchema: (id: string, changes: Partial<SchemaComponent>) => void;
  deleteSchema: (id: string) => void;

  // Security scheme actions
  addSecurityScheme: (s: Partial<SecurityScheme>) => void;
  updateSecurityScheme: (id: string, changes: Partial<SecurityScheme>) => void;
  deleteSecurityScheme: (id: string) => void;

  // History
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;

  // Search / filter
  setSearchQuery: (q: string) => void;
  setFilterTag: (tag: string | null) => void;

  // Import full spec
  importSpec: (spec: ApiSpec) => void;
  resetSpec: () => void;

  // Per-endpoint auto-save (debounced)
  scheduleEndpointSave: (id: string) => void;
  flushEndpointSave: (id: string) => Promise<void>;
}

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const cloneSpec = (s: ApiSpec): ApiSpec => deepClone(s);

// Module-scope Map for per-endpoint debounce timers (keyed by endpoint id).
const pendingEndpointSaves = new Map<string, ReturnType<typeof setTimeout>>();

export const useApiSpecStore = create<ApiSpecStore>()(
  persist(
    (set, get) => ({
      spec: DEFAULT_SPEC,
      activeEndpointId: DEFAULT_SPEC.endpoints[0]?.id ?? null,
      activeProjectId: null,
      localUpdatedAt: null,
      lastSavedAt: null,
      history: [],
      historyIndex: -1,
      searchQuery: '',
      filterTag: null,

      loadProject: async (id: string) => {
        let data;
        try {
          data = await projectApi.get(id);
        } catch {
          const { toast } = await import('react-hot-toast');
          toast.error('Failed to load project');
          return;
        }

        // Reconstruct a local ApiSpec from project metadata + endpoint rows.
        // Each endpoint stores its detail in spec_data JSONB.
        const endpoints: ApiSpec['endpoints'] = data.endpoints.map((dto) => {
          const sd = dto.specData ?? {};
          return {
            id: dto.id,
            path: dto.path,
            method: (dto.method as ApiSpec['endpoints'][number]['method']) ?? 'GET',
            summary: typeof sd.summary === 'string' ? sd.summary : undefined,
            description: typeof sd.description === 'string' ? sd.description : undefined,
            operationId: typeof sd.operationId === 'string' ? sd.operationId : undefined,
            tags: Array.isArray(sd.tags) ? (sd.tags as string[]) : [],
            deprecated: Boolean(sd.deprecated),
            security: Array.isArray(sd.security) ? (sd.security as string[]) : undefined,
            parameters: Array.isArray(sd.parameters) ? (sd.parameters as ApiSpec['endpoints'][number]['parameters']) : [],
            requestBody: sd.requestBody as ApiSpec['endpoints'][number]['requestBody'],
            responses: Array.isArray(sd.responses) ? (sd.responses as ApiSpec['endpoints'][number]['responses']) : [],
          };
        });

        const spec: ApiSpec = {
          ...DEFAULT_SPEC,
          id: data.project.id,
          info: {
            ...DEFAULT_SPEC.info,
            title: data.project.name,
            description: data.project.description ?? undefined,
          },
          endpoints,
          tags: [],
          components: { schemas: [], securitySchemes: [] },
          globalSecurity: [],
          servers: [],
          openApiVersion: 'openapi3',
        };

        get().pushHistory();
        set({
          spec,
          activeProjectId: id,
          activeEndpointId: endpoints[0]?.id ?? null,
          localUpdatedAt: data.project.updatedAt ?? null,
          lastSavedAt: data.project.updatedAt ?? null,
        });
      },

      createNewProject: async (name: string): Promise<boolean> => {
        const newSpec: ApiSpec = {
          ...DEFAULT_SPEC,
          id: uuidv4(),
          info: { ...DEFAULT_SPEC.info, title: name },
        };

        let data;
        try {
          data = await projectApi.create(name);
        } catch (err: unknown) {
          console.error('[createNewProject]', err);
          const { toast } = await import('react-hot-toast');
          toast.error(`Failed to create project: ${getErrorMessage(err, 'Unknown error')}`);
          return false;
        }

        get().pushHistory();
        set({
          spec: newSpec,
          activeProjectId: data.id,
          activeEndpointId: newSpec.endpoints[0]?.id ?? null,
          localUpdatedAt: data.updatedAt ?? null,
          lastSavedAt: data.updatedAt ?? null,
        });
        return true;
      },

      importProject: async (name: string, spec: ApiSpec): Promise<boolean> => {
        let data;
        try {
          data = await projectApi.create(name);
        } catch (err: unknown) {
          console.error('[importProject]', err);
          const { toast } = await import('react-hot-toast');
          toast.error(`Failed to import project: ${getErrorMessage(err, 'Unknown error')}`);
          return false;
        }

        // Persist each endpoint as a row (best-effort, non-blocking).
        const { endpointApi } = await import('../lib/api');
        for (const ep of spec.endpoints) {
          endpointApi
            .create({
              projectId: data.id,
              path: ep.path,
              method: ep.method,
              summary: ep.summary,
              specData: {
                tags: ep.tags,
                deprecated: ep.deprecated,
                security: ep.security,
                parameters: ep.parameters,
                requestBody: ep.requestBody,
                responses: ep.responses,
                operationId: ep.operationId,
                description: ep.description,
              },
            })
            .catch((e) => console.error('[importProject] endpoint save failed', e));
        }

        get().pushHistory();
        set({
          spec,
          activeProjectId: data.id,
          activeEndpointId: spec.endpoints[0]?.id ?? null,
          localUpdatedAt: data.updatedAt ?? null,
          lastSavedAt: data.updatedAt ?? null,
        });
        return true;
      },

      saveProject: async (forceOverwrite = false) => {
        const { spec, activeProjectId, localUpdatedAt } = get();
        if (!activeProjectId) return;

        // ── Optimistic locking: check if someone else saved since we loaded ──
        if (!forceOverwrite) {
          let current;
          try {
            current = await projectApi.get(activeProjectId);
          } catch (err: unknown) {
            const { toast } = await import('react-hot-toast');
            toast.error(`Failed to save: ${getErrorMessage(err, 'Unknown error')}`);
            return;
          }

          const serverUpdatedAt: string | null = current.project.updatedAt ?? null;

          // Timestamps may include sub-second precision; normalise to seconds.
          const toSec = (ts: string | null) => ts ? ts.slice(0, 19) : null;
          if (localUpdatedAt && serverUpdatedAt && toSec(serverUpdatedAt) !== toSec(localUpdatedAt)) {
            throw new SaveConflictError(serverUpdatedAt);
          }
        }

        // ── Save project name (spec is saved per-endpoint via endpointApi) ──
        let updated;
        try {
          updated = await projectApi.update(activeProjectId, {
            name: spec.info.title,
          });
        } catch (err: unknown) {
          console.error('[saveProject]', err);
          const { toast } = await import('react-hot-toast');
          toast.error(`Failed to save project: ${getErrorMessage(err, 'Unknown error')}`);
          return;
        }

        // ── Persist each endpoint to its own row (debounced caller handles frequency) ──
        const { endpointApi } = await import('../lib/api');
        for (const ep of spec.endpoints) {
          endpointApi
            .update(ep.id, {
              path: ep.path,
              method: ep.method,
              summary: ep.summary,
              specData: {
                tags: ep.tags,
                deprecated: ep.deprecated,
                security: ep.security,
                parameters: ep.parameters,
                requestBody: ep.requestBody,
                responses: ep.responses,
                operationId: ep.operationId,
                description: ep.description,
              },
            })
            .catch((e) => console.error('[saveProject] endpoint save failed', e));
        }

        // ── Update localUpdatedAt so subsequent saves don't false-alarm ───────
        const newTs: string | null = updated.updatedAt ?? new Date().toISOString();
        set({ localUpdatedAt: newTs, lastSavedAt: newTs });
      },

      deleteProject: async (id: string): Promise<boolean> => {
        try {
          await projectApi.remove(id);
        } catch (err: unknown) {
          console.error('[deleteProject]', err);
          const { toast } = await import('react-hot-toast');
          toast.error(`Failed to delete project: ${getErrorMessage(err, 'Unknown error')}`);
          return false;
        }

        // If the deleted project was currently active, reset state
        if (get().activeProjectId === id) {
          set({ activeProjectId: null });
        }
        return true;
      },

      renameProject: async (id: string, name: string): Promise<boolean> => {
        const trimmed = name.trim();
        if (!trimmed) return false;

        try {
          await projectApi.update(id, { name: trimmed });
        } catch (err: unknown) {
          console.error('[renameProject]', err);
          const { toast } = await import('react-hot-toast');
          toast.error(`Failed to rename project: ${getErrorMessage(err, 'Unknown error')}`);
          return false;
        }

        // Keep spec.info.title in sync if this is the currently active project
        if (get().activeProjectId === id) {
          set((s) => ({ spec: { ...s.spec, info: { ...s.spec.info, title: trimmed } } }));
        }
        return true;
      },

      pushHistory: () => {
        const { spec, history, historyIndex } = get();
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push({ spec: cloneSpec(spec), timestamp: Date.now() });
        if (newHistory.length > 50) newHistory.shift();
        set({ history: newHistory, historyIndex: newHistory.length - 1 });
      },

      setSpec: (spec) => {
        get().pushHistory();
        set({ spec });
      },

      updateInfo: (info) => {
        get().pushHistory();
        set((s) => ({ spec: { ...s.spec, info: { ...s.spec.info, ...info } } }));
      },

      setOpenApiVersion: (v) => set((s) => ({ spec: { ...s.spec, openApiVersion: v } })),
      setGlobalSecurity: (schemes) => set((s) => ({ spec: { ...s.spec, globalSecurity: schemes } })),

      setActiveEndpoint: (id) => set({ activeEndpointId: id }),

      addEndpoint: (ep = {}) => {
        get().pushHistory();
        const state = get();
        const activeEp = state.spec.endpoints.find((e) => e.id === state.activeEndpointId);
        const defaultTags = activeEp?.tags.length ? activeEp.tags : (state.filterTag ? [state.filterTag] : []);
        
        const newEp: Endpoint = {
          id: uuidv4(),
          path: '/api/v1/new-endpoint',
          method: 'GET',
          summary: 'New Endpoint',
          tags: defaultTags,
          deprecated: false,
          parameters: [],
          responses: [{ id: uuidv4(), statusCode: '200', description: 'Success', schema: [] }],
          ...ep,
        };
        set((s) => ({
          spec: { ...s.spec, endpoints: [...s.spec.endpoints, newEp] },
          activeEndpointId: newEp.id,
        }));
      },

      updateEndpoint: (id, changes) => {
        set((s) => ({
          spec: {
            ...s.spec,
            endpoints: s.spec.endpoints.map((e) => (e.id === id ? { ...e, ...changes } : e)),
          },
        }));
        // Schedule debounced per-endpoint save to backend
        get().scheduleEndpointSave(id);
      },

      duplicateEndpoint: (id) => {
        get().pushHistory();
        const ep = get().spec.endpoints.find((e) => e.id === id);
        if (!ep) return;
        const newEp: Endpoint = { ...deepClone(ep), id: uuidv4(), operationId: undefined };
        set((s) => ({
          spec: { ...s.spec, endpoints: [...s.spec.endpoints, newEp] },
          activeEndpointId: newEp.id,
        }));
      },

      deleteEndpoint: (id) => {
        get().pushHistory();
        set((s) => ({
          spec: { ...s.spec, endpoints: s.spec.endpoints.filter((e) => e.id !== id) },
          activeEndpointId: s.activeEndpointId === id ? null : s.activeEndpointId,
        }));
      },

      clearEndpoints: () => {
        get().pushHistory();
        set((s) => ({
          spec: { ...s.spec, endpoints: [] },
          activeEndpointId: null,
        }));
      },

      reorderEndpoints: (from, to) => {
        const eps = [...get().spec.endpoints];
        const [moved] = eps.splice(from, 1);
        eps.splice(to, 0, moved);
        set((s) => ({ spec: { ...s.spec, endpoints: eps } }));
      },

      addTag: (tag = {}) => {
        const newTag: ApiTag = { id: uuidv4(), name: 'New Tag', ...tag };
        set((s) => ({ spec: { ...s.spec, tags: [...s.spec.tags, newTag] } }));
      },

      updateTag: (id, changes) =>
        set((s) => ({ spec: { ...s.spec, tags: s.spec.tags.map((t) => (t.id === id ? { ...t, ...changes } : t)) } })),

      deleteTag: (id) =>
        set((s) => ({ spec: { ...s.spec, tags: s.spec.tags.filter((t) => t.id !== id) } })),

      addSchema: (schema = {}) => {
        const newSchema: SchemaComponent = { id: uuidv4(), name: 'NewSchema', properties: [], ...schema };
        set((s) => ({ spec: { ...s.spec, components: { ...s.spec.components, schemas: [...s.spec.components.schemas, newSchema] } } }));
      },

      updateSchema: (id, changes) =>
        set((s) => ({
          spec: {
            ...s.spec,
            components: {
              ...s.spec.components,
              schemas: s.spec.components.schemas.map((sc) => (sc.id === id ? { ...sc, ...changes } : sc)),
            },
          },
        })),

      deleteSchema: (id) =>
        set((s) => ({
          spec: {
            ...s.spec,
            components: {
              ...s.spec.components,
              schemas: s.spec.components.schemas.filter((sc) => sc.id !== id),
            },
          },
        })),

      addSecurityScheme: (scheme = {}) => {
        const s: SecurityScheme = { id: uuidv4(), name: 'newAuth', type: 'bearer', ...scheme };
        set((st) => ({
          spec: {
            ...st.spec,
            components: { ...st.spec.components, securitySchemes: [...st.spec.components.securitySchemes, s] },
          },
        }));
      },

      updateSecurityScheme: (id, changes) =>
        set((st) => ({
          spec: {
            ...st.spec,
            components: {
              ...st.spec.components,
              securitySchemes: st.spec.components.securitySchemes.map((ss) => (ss.id === id ? { ...ss, ...changes } : ss)),
            },
          },
        })),

      deleteSecurityScheme: (id) =>
        set((st) => ({
          spec: {
            ...st.spec,
            components: {
              ...st.spec.components,
              securitySchemes: st.spec.components.securitySchemes.filter((ss) => ss.id !== id),
            },
          },
        })),

      undo: () => {
        const { history, historyIndex } = get();
        if (historyIndex <= 0) return;
        const newIndex = historyIndex - 1;
        set({ spec: cloneSpec(history[newIndex].spec), historyIndex: newIndex });
      },

      redo: () => {
        const { history, historyIndex } = get();
        if (historyIndex >= history.length - 1) return;
        const newIndex = historyIndex + 1;
        set({ spec: cloneSpec(history[newIndex].spec), historyIndex: newIndex });
      },

      setSearchQuery: (q) => set({ searchQuery: q }),
      setFilterTag: (tag) => set({ filterTag: tag }),

      importSpec: (spec) => {
        get().pushHistory();
        set({ spec, activeEndpointId: spec.endpoints[0]?.id ?? null });
      },

      resetSpec: () => {
        get().pushHistory();
        set({ spec: { ...DEFAULT_SPEC, id: uuidv4() }, activeEndpointId: DEFAULT_SPEC.endpoints[0]?.id ?? null });
      },

      // ── Per-endpoint debounced auto-save (800ms idle) ────────────────────
      scheduleEndpointSave: (id: string) => {
        // Clear any pending save for this endpoint, set a new timer.
        const existing = pendingEndpointSaves.get(id);
        if (existing) clearTimeout(existing);
        const timer = setTimeout(() => {
          pendingEndpointSaves.delete(id);
          void get().flushEndpointSave(id);
        }, 800);
        pendingEndpointSaves.set(id, timer);
      },

      flushEndpointSave: async (id: string) => {
        const timer = pendingEndpointSaves.get(id);
        if (timer) {
          clearTimeout(timer);
          pendingEndpointSaves.delete(id);
        }
        const ep = get().spec.endpoints.find((e) => e.id === id);
        if (!ep || !get().activeProjectId) return;
        try {
          const { endpointApi } = await import('../lib/api');
          await endpointApi.update(id, {
            path: ep.path,
            method: ep.method,
            summary: ep.summary,
            specData: {
              tags: ep.tags,
              deprecated: ep.deprecated,
              security: ep.security,
              parameters: ep.parameters,
              requestBody: ep.requestBody,
              responses: ep.responses,
              operationId: ep.operationId,
              description: ep.description,
            },
          });
        } catch (err) {
          console.error('[flushEndpointSave]', err);
        }
      },
    }),
    {
      name: 'api-spec-store',
      version: 1,
      // Migrate persisted state between versions.
      // When bumping `version`, add a case here to transform the old shape.
      migrate: (persistedState: unknown, fromVersion: number): ApiSpecStore => {
        const s = persistedState as ApiSpecStore;
        // v0 → v1: no breaking changes
        if (fromVersion < 1) return s;
        return s;
      },
    }
  )
);

import dotenv from 'dotenv'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import pg from 'pg'

dotenv.config({ path: new URL('../../../.env', import.meta.url), quiet: true })

import { ProjectEntity } from '../src/app/projects/entity/project.entity'
import { EnvironmentsEntity } from '../src/app/projects/entity/environment.entity'
import { TagEntity } from '../src/app/projects/entity/tag.entity'
import { SecuritySchemesEntity } from '../src/app/projects/entity/security-scheme.entity'
import { ComponentSchemasEntity, SchemaPropertiesEntity } from '../src/app/projects/entity/component-schema.entity'
import { EndpointsEntity } from '../src/app/endpoints/entity/endpoint.entity'
import { EndpointParametersEntity } from '../src/app/endpoints/entity/endpoint.parameter.entity'
import { EndpointRequestBodiesEntity } from '../src/app/endpoints/entity/endpoint.request-body.entity'
import { EndpointResponsesEntity } from '../src/app/endpoints/entity/endpoint.response.entity'
import {
  EndpointRequestExamplesEntity,
  EndpointResponseExamplesEntity,
} from '../src/app/endpoints/entity/endpoint.example.entity'
import { EndpointTagsEntity } from '../src/app/endpoints/entity/endpoint.tag.entity'
import { EndpointSecuritySchemesEntity } from '../src/app/endpoints/entity/endpoint.security.entity'
import { generateId } from '../src/lib/string-utils'

// ── minimal shapes of spec_data (see packages/types for the domain model) ──
interface SpecProp {
  id?: string
  name?: string
  type?: string
  format?: string
  required?: boolean
  nullable?: boolean
  description?: string
  example?: unknown
  default?: unknown
  enum?: string[]
  properties?: SpecProp[]
  items?: unknown
  ref?: string
}
interface SpecSchema {
  id?: string
  name?: string
  description?: string
  properties?: SpecProp[]
}
interface SecuritySchemeDef {
  id?: string
  name?: string
  type?: string
  description?: string
  scheme?: string
  bearerFormat?: string
  in?: string
  keyName?: string
  flows?: unknown
}
interface EndpointParam {
  id?: string
  name?: string
  in?: string
  required?: boolean
  description?: string
  schema?: { type?: string; format?: string; example?: unknown; enum?: string[]; items?: unknown }
}
interface ExampleDef {
  id?: string
  name?: string
  summary?: string
  value?: string
}
interface RequestBodyDef {
  required?: boolean
  description?: string
  contentType?: string
  mode?: 'visual' | 'raw' | 'ref'
  rawJson?: string
  ref?: string
  schema?: SpecProp[]
  examples?: ExampleDef[]
}
interface ResponseDef {
  id?: string
  statusCode?: string
  description?: string
  contentType?: string
  mode?: 'visual' | 'raw' | 'ref'
  rawJson?: string
  ref?: string
  schema?: SpecProp[]
  example?: unknown
  examples?: ExampleDef[]
}
interface EndpointDef {
  id?: string
  path?: string
  method?: string
  summary?: string
  description?: string
  operationId?: string
  deprecated?: boolean
  tags?: string[]
  security?: string[]
  parameters?: EndpointParam[]
  requestBody?: RequestBodyDef
  responses?: ResponseDef[]
}
interface SpecData {
  info?: { title?: string; version?: string; description?: string }
  servers?: { url?: string; name?: string; description?: string }[]
  tags?: { id?: string; name?: string; description?: string }[]
  endpoints?: EndpointDef[]
  components?: { schemas?: SpecSchema[]; securitySchemes?: SecuritySchemeDef[] }
  globalSecurity?: string[]
  openApiVersion?: unknown
}

const TARGET_URL = process.env.TARGET_DATABASE_URL ?? process.env.DATABASE_URL
if (!TARGET_URL) {
  console.error('❌ TARGET_DATABASE_URL / DATABASE_URL is not set')
  process.exit(1)
}

const pool = new pg.Pool({ connectionString: TARGET_URL, ssl: { rejectUnauthorized: false }, max: 5 })
const db = drizzle(pool)

function hostFromUrl(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url.split('/')[2] ?? url
  }
}

function collectProps(
  schemaId: string,
  list: SpecProp[] | undefined,
  parentId: string | null,
  owner: string | undefined,
  out: (typeof SchemaPropertiesEntity.$inferInsert)[],
): number {
  let count = 0
  const listSafe = list ?? []
  for (let i = 0; i < listSafe.length; i += 1) {
    const p = listSafe[i]
    out.push({
      id: p.id ?? generateId(),
      schema_id: parentId ? undefined : schemaId,
      parent_id: parentId ?? undefined,
      name: p.name ?? 'item',
      type: (p.type ?? 'string') as (typeof SchemaPropertiesEntity.$inferInsert.type),
      format: p.format ?? undefined,
      required: p.required ?? false,
      nullable: p.nullable ?? false,
      description: p.description ?? undefined,
      example: p.example ?? null,
      default_value: p.default ?? null,
      enum_values: p.enum ?? null,
      items: p.items ?? null,
      ref: p.ref ?? undefined,
      sort_order: i,
      created_by: owner,
    })
    count += 1
    if (p.properties) count += collectProps(schemaId, p.properties, p.id ?? generateId(), owner, out)
  }
  return count
}

const summary = { projects: 0 }
async function main() {
  await db.transaction(async (tx) => {
    const projects = await tx.select().from(ProjectEntity).where(eq(ProjectEntity.active, true))

    for (const project of projects) {
      const spec = (project.spec_data ?? {}) as SpecData
      const owner = project.created_by ?? undefined
      const counts: Record<string, number> = {}

      const tagIdByName = new Map<string, string>()
      const schemeIdByName = new Map<string, string>()
      const schemaIdByName = new Map<string, string>()
      const ensureTag = async (name: string): Promise<string> => {
        const existing = tagIdByName.get(name)
        if (existing) return existing
        const id = generateId()
        await tx.insert(TagEntity).values({ id, project_id: project.id, name, created_by: owner })
        tagIdByName.set(name, id)
        counts.tags = (counts.tags ?? 0) + 1
        return id
      }
      const ensureScheme = async (name: string): Promise<string> => {
        const existing = schemeIdByName.get(name)
        if (existing) return existing
        const id = generateId()
        await tx.insert(SecuritySchemesEntity).values({
          id,
          project_id: project.id,
          name,
          type: 'bearer',
          created_by: owner,
        })
        schemeIdByName.set(name, id)
        counts.securitySchemes = (counts.securitySchemes ?? 0) + 1
        return id
      }

      // ── reset per project (FK cascades clean children) ─────────────────────
      await tx.delete(ComponentSchemasEntity).where(eq(ComponentSchemasEntity.project_id, project.id))
      await tx.delete(EndpointsEntity).where(eq(EndpointsEntity.project_id, project.id))
      await tx.delete(SecuritySchemesEntity).where(eq(SecuritySchemesEntity.project_id, project.id))
      await tx.delete(TagEntity).where(eq(TagEntity.project_id, project.id))
      await tx.delete(EnvironmentsEntity).where(eq(EnvironmentsEntity.project_id, project.id))

      // ── project metadata ────────────────────────────────────────────────────
      const schemes = spec.components?.securitySchemes ?? []
      for (const s of schemes) schemeIdByName.set(s.name ?? '', s.id ?? generateId())
      const globalBySpecName = (spec.globalSecurity ?? []).map((n) => schemeIdByName.get(n) ?? n)
      await tx
        .update(ProjectEntity)
        .set({
          description: spec.info?.description ?? null,
          version: spec.info?.version ?? project.version ?? '1.0.0',
          openapi_version: spec.openApiVersion === 'swagger2' ? 'swagger2' : 'openapi3',
          global_security: globalBySpecName.length ? globalBySpecName : [],
          updated_by: owner,
          updated_date: Date.now(),
        })
        .where(eq(ProjectEntity.id, project.id))

      // ── environments (from servers) ─────────────────────────────────────────
      const envRows: (typeof EnvironmentsEntity.$inferInsert)[] = []
      const servers = spec.servers ?? []
      for (let i = 0; i < servers.length; i += 1) {
        const s = servers[i]
        const url = (s.url ?? '').trim()
        if (!url) continue
        envRows.push({
          id: generateId(),
          project_id: project.id,
          name: s.name ?? hostFromUrl(url) ?? 'Default',
          description: s.description ?? undefined,
          base_url: url,
          variables: {},
          is_active: i === 0,
          sort_order: i,
          created_by: owner,
        })
      }
      if (envRows.length) {
        await tx.insert(EnvironmentsEntity).values(envRows)
        counts.environments = envRows.length
      }

      // ── tags ────────────────────────────────────────────────────────────────
      const tagRows: (typeof TagEntity.$inferInsert)[] = []
      for (const t of spec.tags ?? []) {
        const id = t.id ?? generateId()
        tagIdByName.set(t.name ?? '', id)
        tagRows.push({
          id,
          project_id: project.id,
          name: t.name ?? 'Unnamed',
          description: t.description ?? undefined,
          created_by: owner,
        })
      }
      if (tagRows.length) {
        await tx.insert(TagEntity).values(tagRows)
        counts.tags = tagRows.length
      }

      // ── security schemes ────────────────────────────────────────────────────
      const schemeRows: (typeof SecuritySchemesEntity.$inferInsert)[] = []
      for (const s of schemes) {
        const id = s.id ?? generateId()
        schemeIdByName.set(s.name ?? '', id)
        const type = s.type ?? (s.keyName ? 'apiKey' : 'bearer')
        schemeRows.push({
          id,
          project_id: project.id,
          name: s.name ?? 'Anonymous',
          type: (type as 'bearer' | 'basic' | 'apiKey' | 'oauth2' | 'none') ?? 'bearer',
          description: s.description ?? undefined,
          scheme: s.scheme ?? undefined,
          bearer_format: s.bearerFormat ?? undefined,
          location: s.in ? (s.in as 'header' | 'query' | 'cookie') : undefined,
          key_name: s.keyName ?? undefined,
          flows: s.flows,
          created_by: owner,
        })
      }
      if (schemeRows.length) {
        await tx.insert(SecuritySchemesEntity).values(schemeRows)
        counts.securitySchemes = schemeRows.length
      }

      // ── component schemas + recursive properties ────────────────────────────
      let propCount = 0
      for (const c of spec.components?.schemas ?? []) {
        const id = c.id ?? generateId()
        schemaIdByName.set(c.name ?? '', id)
        await tx.insert(ComponentSchemasEntity).values({
          id,
          project_id: project.id,
          name: c.name ?? 'Unnamed',
          description: c.description ?? undefined,
          created_by: owner,
        })
        const props: (typeof SchemaPropertiesEntity.$inferInsert)[] = []
        propCount += collectProps(id, c.properties, null, owner, props)
        if (props.length) await tx.insert(SchemaPropertiesEntity).values(props)
      }
      counts.schemas = (spec.components?.schemas ?? []).length
      counts.properties = propCount

      // ── endpoints + children ────────────────────────────────────────────────
      let epCount = 0
      let paramCount = 0
      let bodyCount = 0
      let respCount = 0
      let reqExCount = 0
      let respExCount = 0

      const endpoints = spec.endpoints ?? []
      for (let ei = 0; ei < endpoints.length; ei += 1) {
        const ep = endpoints[ei]
        const epId = ep.id ?? generateId()
        await tx.insert(EndpointsEntity).values({
          id: epId,
          project_id: project.id,
          path: ep.path ?? '/',
          method: ep.method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
          summary: ep.summary ?? '',
          description: ep.description ?? undefined,
          operation_id: ep.operationId ?? undefined,
          deprecated: ep.deprecated ?? false,
          sort_order: ei,
          created_by: owner,
        })
        epCount += 1

        const parameters = ep.parameters ?? []
        for (let pi = 0; pi < parameters.length; pi += 1) {
          const p = parameters[pi]
          await tx.insert(EndpointParametersEntity).values({
            id: p.id ?? generateId(),
            endpoint_id: epId,
            location: (p.in as 'path' | 'query' | 'header' | 'cookie') ?? 'query',
            name: p.name ?? '',
            required: p.required ?? false,
            description: p.description ?? undefined,
            schema_type: p.schema?.type as 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null' | undefined,
            format: p.schema?.format ?? undefined,
            example: p.schema?.example ?? null,
            enum_values: p.schema?.enum ?? null,
            items: p.schema?.items ?? null,
            sort_order: pi,
            created_by: owner,
          })
          paramCount += 1
        }

        if (ep.requestBody) {
          const rb = ep.requestBody
          const rbId = generateId()
          await tx.insert(EndpointRequestBodiesEntity).values({
            id: rbId,
            endpoint_id: epId,
            required: rb.required ?? false,
            description: rb.description ?? undefined,
            content_type: rb.contentType as 'application/json' | 'multipart/form-data' | 'application/x-www-form-urlencoded' | undefined ?? 'application/json',
            mode: rb.mode ?? null,
            schema_ref: rb.ref ? (schemaIdByName.get(rb.ref) ?? null) : null,
            schema_data: rb.schema && rb.schema.length ? rb.schema : null,
            raw_json: rb.rawJson ?? null,
            created_by: owner,
          })
          bodyCount += 1
          const rbExamples = rb.examples ?? []
          for (let exi = 0; exi < rbExamples.length; exi += 1) {
            const ex = rbExamples[exi]
            await tx.insert(EndpointRequestExamplesEntity).values({
              id: ex.id ?? generateId(),
              request_body_id: rbId,
              name: ex.name ?? 'example',
              summary: ex.summary ?? undefined,
              value: ex.value ?? '',
              sort_order: exi,
              created_by: owner,
            })
            reqExCount += 1
          }
        }

        const responses = ep.responses ?? []
        for (let ri = 0; ri < responses.length; ri += 1) {
          const r = responses[ri]
          const respId = r.id ?? generateId()
          await tx.insert(EndpointResponsesEntity).values({
            id: respId,
            endpoint_id: epId,
            status_code: r.statusCode ?? '',
            description: r.description ?? '',
            content_type: r.contentType ?? undefined,
            mode: r.mode ?? null,
            schema_ref: r.ref ? (schemaIdByName.get(r.ref) ?? null) : null,
            schema_data: r.schema && r.schema.length ? r.schema : null,
            raw_json: r.rawJson ?? (r.example !== undefined ? JSON.stringify(r.example, null, 2) : null),
            sort_order: ri,
            created_by: owner,
          })
          respCount += 1
          const respExamples = r.examples ?? []
          for (let exi = 0; exi < respExamples.length; exi += 1) {
            const ex = respExamples[exi]
            await tx.insert(EndpointResponseExamplesEntity).values({
              id: ex.id ?? generateId(),
              response_id: respId,
              name: ex.name ?? 'example',
              summary: ex.summary ?? undefined,
              value: ex.value ?? '',
              sort_order: exi,
              created_by: owner,
            })
            respExCount += 1
          }
        }

        const tagNames: string[] = []
        for (const n of ep.tags ?? []) if (!tagNames.includes(n)) tagNames.push(n)
        for (let ti = 0; ti < tagNames.length; ti += 1) {
          await tx.insert(EndpointTagsEntity).values({ endpoint_id: epId, tag_id: await ensureTag(tagNames[ti]) })
        }
        const securityNames: string[] = []
        for (const n of ep.security ?? []) if (!securityNames.includes(n)) securityNames.push(n)
        for (let si = 0; si < securityNames.length; si += 1) {
          await tx.insert(EndpointSecuritySchemesEntity).values({
            endpoint_id: epId,
            security_scheme_id: await ensureScheme(securityNames[si]),
          })
        }
      }

      counts.endpoints = epCount
      counts.parameters = paramCount
      counts.requestBodies = bodyCount
      counts.responses = respCount
      counts.requestExamples = reqExCount
      counts.responseExamples = respExCount

      summary.projects += 1
      console.log(
        `✅ ${project.name} — ` +
          Object.entries(counts)
            .map(([k, v]) => `${k}=${v}`)
            .join(' · '),
      )
    }
  })

  console.log(`\n🎉 Refactor complete for ${summary.projects} active project(s)`)
}

main().catch((err) => {
  console.error('❌ Refactor failed:', err)
  process.exit(1)
})
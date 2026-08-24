import type { EndpointDto } from "../lib/api";
import type { ResponseDefinition } from "@modern-api-studio/types";

export interface MockUrlItem {
  endpointId: string;
  endpointMethod: string;
  endpointPath: string;
  endpointSummary: string;
  responseStatus: string;
  exampleId: string | null;
  exampleName: string | null;
  exampleSummary: string | null;
  /** Path under the API server, e.g. `/api/mock/:endpointId/ex/:exampleId`. */
  path: string;
}

/**
 * Every servable mock URL for a project's endpoints: one entry per stored
 * response example, plus a status-level fallback when only a schema exists.
 */
export function collectProjectMockUrls(
  endpoints: EndpointDto[],
): MockUrlItem[] {
  return endpoints.flatMap((endpoint) => {
    const responses = Array.isArray(endpoint.specData?.responses)
      ? (endpoint.specData.responses as ResponseDefinition[])
      : [];
    const entries = responses.flatMap<MockUrlItem>((response) => {
      const base = {
        endpointId: endpoint.id,
        endpointMethod: endpoint.method,
        endpointPath: endpoint.path,
        endpointSummary: endpoint.summary ?? "",
        responseStatus: response.statusCode,
      };
      if (response.examples?.length) {
        return response.examples.map((example) => ({
          ...base,
          exampleId: example.id,
          exampleName: example.name ?? null,
          exampleSummary: example.summary ?? null,
          path: `/api/mock/${endpoint.id}/ex/${example.id}`,
        }));
      }
      if (
        response.example !== undefined ||
        (response.schema?.length ?? 0) > 0
      ) {
        return [
          {
            ...base,
            exampleId: null,
            exampleName: null,
            exampleSummary: null,
            path: `/api/mock/${endpoint.id}/${response.statusCode}`,
          },
        ];
      }
      return [];
    });
    return entries;
  });
}

export function buildMockUrl(path: string, originOverride?: string): string {
  const apiBase =
    originOverride ?? import.meta.env.VITE_API_URL ?? window.location.origin;
  const trimmed = apiBase.replace(/\/+$/, "");
  return `${trimmed}${path}`;
}

import type { RequestBodyDefinition } from '@modern-api-studio/types';

/** Text shown in the Body tab for a request body definition. */
export function initialBody(body?: RequestBodyDefinition): string {
  if (body?.rawJson) return body.rawJson;
  if (!body?.schema?.length) return '';
  return JSON.stringify(
    Object.fromEntries(
      body.schema.map((field) => [field.name, field.example ?? (field.type === 'string' ? '' : 0)]),
    ),
    null,
    2,
  );
}

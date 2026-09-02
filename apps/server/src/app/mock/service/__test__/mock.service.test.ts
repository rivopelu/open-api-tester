import { describe, expect, test } from 'vitest'
import { collectMockExamples, resolveMock } from '../mock.service'

describe('resolveMock', () => {
  test('returns the first example of the first response by default', () => {
    const payload = resolveMock({
      responses: [
        {
          id: 'r1',
          statusCode: '200',
          description: 'OK',
          contentType: 'application/json',
          examples: [
            { id: 'ex-1', name: 'success', value: '{"ok":true}' },
            { id: 'ex-2', name: 'verbose', value: '{"ok":true,"verbose":true}' },
          ],
        },
      ],
    })
    expect(payload.statusCode).toBe(200)
    expect(payload.contentType).toBe('application/json')
    expect(payload.body).toBe('{"ok":true}')
  })

  test('selects a specific example by id and keeps its status code', () => {
    const payload = resolveMock(
      {
        responses: [
          {
            id: 'r1',
            statusCode: '200',
            description: '',
            examples: [{ id: 'a', name: 'x', value: '"ok"' }],
          },
          {
            id: 'r2',
            statusCode: '404',
            description: '',
            examples: [{ id: 'b', name: 'err', value: '{"error":"missing"}' }],
          },
        ],
      },
      { exampleId: 'b' },
    )
    expect(payload.statusCode).toBe(404)
    expect(payload.body).toBe('{"error":"missing"}')
  })

  test('selects an example by name via the example option', () => {
    const payload = resolveMock(
      {
        responses: [
          {
            id: 'r1',
            statusCode: '201',
            description: '',
            examples: [{ id: 'a', name: 'created', value: '[1,2,3]' }],
          },
        ],
      },
      { exampleId: 'created' },
    )
    expect(payload.statusCode).toBe(201)
    expect(JSON.parse(payload.body)).toEqual([1, 2, 3])
  })

  test('falls back to the first example of the requested status', () => {
    const payload = resolveMock(
      {
        responses: [
          {
            id: 'r1',
            statusCode: '200',
            description: '',
            examples: [{ id: 'a', name: 'x', value: '1' }],
          },
          {
            id: 'r2',
            statusCode: '422',
            description: '',
            examples: [{ id: 'b', name: 'y', value: '{"field":"required"}' }],
          },
        ],
      },
      { status: '422' },
    )
    expect(payload.statusCode).toBe(422)
    expect(payload.body).toBe('{"field":"required"}')
  })

  test('uses response.example when no named examples exist', () => {
    const payload = resolveMock({
      responses: [
        {
          id: 'r1',
          statusCode: '204',
          description: '',
          contentType: 'text/plain',
          example: 'pong',
        },
      ],
    })
    expect(payload.statusCode).toBe(204)
    expect(payload.contentType).toBe('text/plain')
    expect(payload.body).toBe('pong')
  })

  test('synthesizes a JSON body from schema when nothing is stored', () => {
    const payload = resolveMock({
      responses: [
        {
          id: 'r1',
          statusCode: '200',
          description: '',
          contentType: 'application/json',
          schema: [
            { name: 'id', type: 'integer', example: 42, required: true, nullable: false },
            { name: 'email', type: 'string', required: true, nullable: false },
            { name: 'active', type: 'boolean', required: false, nullable: false },
            {
              name: 'role',
              type: 'string',
              enum: ['admin', 'user'],
              required: false,
              nullable: false,
            },
          ],
        },
      ],
    })
    expect(JSON.parse(payload.body)).toEqual({ id: 42, email: '', active: false, role: 'admin' })
  })

  test('throws NotFoundError when there are no responses to mock', () => {
    expect(() => resolveMock({})).toThrow()
  })
})

describe('collectMockExamples', () => {
  test('lists one entry per stored example plus status-level fallbacks', () => {
    const entries = collectMockExamples([
      {
        id: 'ep-1',
        method: 'GET',
        path: '/users/{id}',
        summary: 'Get user',
        specData: {
          responses: [
            {
              id: 'r1',
              statusCode: '200',
              description: 'OK',
              examples: [
                { id: 'a', name: 'full', value: '{}' },
                { id: 'b', name: 'compact', value: '{}' },
              ],
            },
            {
              id: 'r2',
              statusCode: '500',
              description: 'Error',
              schema: [{ name: 'message', type: 'string', required: true, nullable: false }],
            },
          ],
        },
      },
      {
        id: 'ep-2',
        method: 'POST',
        path: '/users',
        summary: 'Create user',
        specData: {},
      },
    ])

    expect(entries).toHaveLength(3)
    expect(entries[0]).toMatchObject({
      endpointId: 'ep-1',
      responseStatus: '200',
      exampleId: 'a',
      scope: 'example',
    })
    expect(entries[1]).toMatchObject({ endpointId: 'ep-1', responseStatus: '200', exampleId: 'b' })
    expect(entries[2]).toMatchObject({ endpointId: 'ep-1', responseStatus: '500', exampleId: null })
  })
})

import { describe, expect, test } from 'vitest'
import { ProjectRepository } from '../project.repository'

const mockRow = {
  id: 'proj-1',
  name: 'My API',
  active: true,
  created_date: 1000,
  created_by: 'user-1',
  updated_date: 2000,
  updated_by: null,
  deleted_date: null,
  deleted_by: null,
}

function selectMock(result: unknown[]) {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => Promise.resolve(result),
          limit: () => Promise.resolve(result),
        }),
      }),
    }),
  }
}

function insertMock(result: unknown) {
  return { insert: () => ({ values: () => ({ returning: () => Promise.resolve([result]) }) }) }
}

function insertErrorMock(err: Error) {
  return { insert: () => ({ values: () => ({ returning: () => Promise.reject(err) }) }) }
}

function updateMock(result: unknown) {
  return {
    update: () => ({
      set: () => ({ where: () => ({ returning: () => Promise.resolve([result]) }) }),
    }),
  }
}

function updateErrorMock(err: Error) {
  return {
    update: () => ({ set: () => ({ where: () => ({ returning: () => Promise.reject(err) }) }) }),
  }
}

describe('ProjectRepository', () => {
  test('findActive returns rows', async () => {
    const repo = new ProjectRepository(selectMock([mockRow]) as any)
    const rows = await repo.findActive()
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe('proj-1')
  })

  test('findActive returns empty when none', async () => {
    const repo = new ProjectRepository(selectMock([]) as any)
    expect(await repo.findActive()).toEqual([])
  })

  test('findActiveById returns row when found', async () => {
    const repo = new ProjectRepository(selectMock([mockRow]) as any)
    const row = await repo.findActiveById('proj-1')
    expect(row).toEqual(mockRow)
  })

  test('findActiveById returns null when not found', async () => {
    const repo = new ProjectRepository(selectMock([]) as any)
    expect(await repo.findActiveById('missing')).toBeNull()
  })

  test('insert returns created row', async () => {
    const repo = new ProjectRepository(insertMock(mockRow) as any)
    const row = await repo.insert({ name: 'My API', created_by: 'user-1' })
    expect(row.id).toBe('proj-1')
  })

  test('insert throws when insert fails', async () => {
    const repo = new ProjectRepository(insertErrorMock(new Error('DB error')) as any)
    expect(repo.insert({ name: 'X', created_by: 'user-1' })).rejects.toThrow('DB error')
  })

  test('update returns updated row with updated_date', async () => {
    const repo = new ProjectRepository(
      updateMock({ ...mockRow, name: 'Updated', updated_date: 3000 }) as any,
    )
    const row = await repo.update('proj-1', { name: 'Updated' })
    expect(row.name).toBe('Updated')
    expect(row.updated_date).toBe(3000)
  })

  test('update throws when update fails', async () => {
    const repo = new ProjectRepository(updateErrorMock(new Error('DB error')) as any)
    expect(repo.update('proj-1', { name: 'X' })).rejects.toThrow('DB error')
  })

  test('softDelete marks row inactive', async () => {
    const repo = new ProjectRepository(
      updateMock({ ...mockRow, active: false, deleted_date: 3000 }) as any,
    )
    const row = await repo.softDelete('proj-1', 'user-1')
    expect(row.active).toBe(false)
    expect(row.deleted_date).toBe(3000)
  })

  test('softDelete throws when update fails', async () => {
    const repo = new ProjectRepository(updateErrorMock(new Error('DB error')) as any)
    expect(repo.softDelete('proj-1')).rejects.toThrow('DB error')
  })
})

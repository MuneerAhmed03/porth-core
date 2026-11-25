import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AndroidDB } from '../db/android'

describe('AndroidDB', () => {
  const bridge = {
    storageGet: vi.fn<[string], string>(),
    storageSet: vi.fn<[string, string], string>(),
    storageDelete: vi.fn<[string], string>(),
    storageClear: vi.fn<[], string>(),
    storageKeys: vi.fn<[], string>(),
    dbQuery: vi.fn<[string, string | null, string], string>(),
    dbQueryRaw: vi.fn<[string, string | null, string], string>()
  }

  const db = new AndroidDB()

  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      writable: true,
      value: {} as Window
    })
    Object.defineProperty(window, 'AndroidBridge', {
      configurable: true,
      writable: true,
      value: bridge
    })
  })

  it('all passes SQL, JSON params, and mode to dbQuery', async () => {
    bridge.dbQuery.mockReturnValueOnce(JSON.stringify([{ id: 1 }]))
    await db.all('SELECT * FROM t WHERE id = ?', [1])
    expect(bridge.dbQuery).toHaveBeenCalledWith('SELECT * FROM t WHERE id = ?', '[1]', 'all')
  })

  it('all passes null when params are omitted', async () => {
    bridge.dbQuery.mockReturnValueOnce(JSON.stringify([]))
    await db.all('SELECT 1')
    expect(bridge.dbQuery).toHaveBeenCalledWith('SELECT 1', null, 'all')
  })

  it('all throws when response contains error field', async () => {
    bridge.dbQuery.mockReturnValueOnce(JSON.stringify({ error: 'bad sql' }))
    await expect(db.all('BAD SQL')).rejects.toThrow('bad sql')
  })

  it('all returns rows array as-is', async () => {
    const rows = [{ id: 1, name: 'Alice' }]
    bridge.dbQuery.mockReturnValueOnce(JSON.stringify(rows))
    const result = await db.all<typeof rows[number]>('SELECT id, name FROM users')
    expect(result).toEqual(rows)
  })

  it('run uses run mode and returns only the declared changes shape', async () => {
    bridge.dbQuery.mockReturnValueOnce(JSON.stringify({ changes: 2, lastInsertRowid: 0 }))
    const result = await db.run('UPDATE users SET age = ?', [31])
    expect(bridge.dbQuery).toHaveBeenCalledWith('UPDATE users SET age = ?', '[31]', 'run')
    expect(result).toEqual({ changes: 2 })
  })

  it('insert uses insert mode and returns rowid object', async () => {
    bridge.dbQuery.mockReturnValueOnce(JSON.stringify({ changes: 1, lastInsertRowid: 4 }))
    const result = await db.insert('INSERT INTO users(name) VALUES(?)', ['Alice'])
    expect(bridge.dbQuery).toHaveBeenCalledWith('INSERT INTO users(name) VALUES(?)', '["Alice"]', 'insert')
    expect(result).toEqual({ changes: 1, lastInsertRowid: 4 })
  })

  it('exec uses exec mode and resolves undefined', async () => {
    bridge.dbQuery.mockReturnValueOnce(JSON.stringify({ changes: 0, lastInsertRowid: 0 }))
    await expect(db.exec('CREATE TABLE users (id INTEGER)')).resolves.toBeUndefined()
    expect(bridge.dbQuery).toHaveBeenCalledWith('CREATE TABLE users (id INTEGER)', null, 'exec')
  })

  it('exec throws when response contains error field', async () => {
    bridge.dbQuery.mockReturnValueOnce(JSON.stringify({ error: 'bad ddl' }))
    await expect(db.exec('BAD DDL')).rejects.toThrow('bad ddl')
  })

  it('drizzleQuery passes SQL, JSON params, and method to dbQueryRaw', async () => {
    bridge.dbQueryRaw.mockReturnValueOnce(JSON.stringify({ rows: [[1, 'Alice']] }))
    const result = await db.drizzleQuery('SELECT id, name FROM users WHERE id = ?', [1], 'all')
    expect(bridge.dbQueryRaw).toHaveBeenCalledWith('SELECT id, name FROM users WHERE id = ?', '[1]', 'all')
    expect(result).toEqual({ rows: [[1, 'Alice']] })
  })

  it('drizzleQuery throws when raw response contains error field', async () => {
    bridge.dbQueryRaw.mockReturnValueOnce(JSON.stringify({ error: 'bad raw sql' }))
    await expect(db.drizzleQuery('BAD SQL', [], 'all')).rejects.toThrow('bad raw sql')
  })
})

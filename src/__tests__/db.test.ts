import { createRequire } from 'node:module'
import path from 'node:path'
import initSqlJs from 'sql.js'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
const wasmPath = path.join(path.dirname(require.resolve('sql.js')), 'sql-wasm.wasm')

beforeAll(async () => {
  const SQL = await initSqlJs({ locateFile: () => wasmPath, useOldExtensionFunctions: true })
  globalThis.__porthSqlJsInit = () => Promise.resolve(SQL)
})

beforeEach(() => {
  vi.resetModules()
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: { AndroidBridge: undefined } as Window
  })
})

async function getDBModule() {
  const module = await import('../db')
  return module.DB
}

describe('DB browser fallback (sql.js)', () => {
  it('exec runs DDL', async () => {
    const DB = await getDBModule()
    await expect(DB.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)')).resolves.toBeUndefined()
  })

  it('insert returns changes and lastInsertRowid', async () => {
    const DB = await getDBModule()
    await DB.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)')
    const result = await DB.insert('INSERT INTO users (name) VALUES (?)', ['Alice'])
    expect(result).toEqual({ changes: 1, lastInsertRowid: 1 })
  })

  it('insert counts multiple rows', async () => {
    const DB = await getDBModule()
    await DB.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)')
    const result = await DB.insert("INSERT INTO users (name) VALUES ('a'), ('b')")
    expect(result.changes).toBe(2)
  })

  it('insert OR IGNORE on conflict returns zero changes and rowid', async () => {
    const DB = await getDBModule()
    await DB.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT UNIQUE)')
    await DB.insert('INSERT INTO users (name) VALUES (?)', ['Alice'])
    const ignored = await DB.insert('INSERT OR IGNORE INTO users (name) VALUES (?)', ['Alice'])
    expect(ignored).toEqual({ changes: 0, lastInsertRowid: 0 })
  })

  it('insert ON CONFLICT DO NOTHING returns zero changes and rowid', async () => {
    const DB = await getDBModule()
    await DB.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT UNIQUE)')
    await DB.insert('INSERT INTO users (name) VALUES (?)', ['Alice'])
    const ignored = await DB.insert(
      'INSERT INTO users (name) VALUES (?) ON CONFLICT (name) DO NOTHING',
      ['Alice']
    )
    expect(ignored).toEqual({ changes: 0, lastInsertRowid: 0 })
  })

  it('all returns rows with column names', async () => {
    const DB = await getDBModule()
    await DB.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, age INTEGER)')
    await DB.insert('INSERT INTO users (name, age) VALUES (?, ?)', ['Alice', 30])
    const rows = await DB.all<{ id: number; name: string; age: number }>(
      'SELECT id, name, age FROM users'
    )
    expect(rows).toEqual([{ id: 1, name: 'Alice', age: 30 }])
  })

  it('run returns changes for UPDATE and DELETE', async () => {
    const DB = await getDBModule()
    await DB.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)')
    await DB.insert('INSERT INTO users (name) VALUES (?)', ['Alice'])
    const updated = await DB.run('UPDATE users SET name = ? WHERE id = ?', ['Bob', 1])
    expect(updated).toEqual({ changes: 1 })
    const deleted = await DB.run('DELETE FROM users WHERE id = ?', [1])
    expect(deleted).toEqual({ changes: 1 })
  })

  it('all handles CTE reads', async () => {
    const DB = await getDBModule()
    const rows = await DB.all<{ n: number }>('WITH cte AS (SELECT 1 AS n) SELECT n FROM cte')
    expect(rows).toEqual([{ n: 1 }])
  })

  it('all handles multiline SELECT', async () => {
    const DB = await getDBModule()
    const rows = await DB.all<{ n: number }>('SELECT\n1 AS n')
    expect(rows).toEqual([{ n: 1 }])
  })

  it('all handles INSERT ... RETURNING', async () => {
    const DB = await getDBModule()
    await DB.exec('CREATE TABLE notes (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT)')
    const rows = await DB.all<{ id: number; title: string }>(
      'INSERT INTO notes (title) VALUES (?) RETURNING id, title',
      ['first']
    )
    expect(rows).toEqual([{ id: 1, title: 'first' }])
  })

  it('bad SQL throws an Error', async () => {
    const DB = await getDBModule()
    await expect(DB.all('BOOM SQL')).rejects.toThrow()
  })

  it('drizzleQuery returns array rows for read methods', async () => {
    const DB = await getDBModule()
    await DB.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, age INTEGER)')
    await DB.insert('INSERT INTO users (name, age) VALUES (?, ?)', ['Alice', 30])
    const result = await DB.__drizzleQuery('SELECT id, name, age FROM users', [], 'all')
    expect(result).toEqual({ rows: [[1, 'Alice', 30]] })
  })

  it('drizzleQuery returns a single array row for get', async () => {
    const DB = await getDBModule()
    await DB.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, age INTEGER)')
    await DB.insert('INSERT INTO users (name, age) VALUES (?, ?)', ['Alice', 30])
    const result = await DB.__drizzleQuery('SELECT id, name, age FROM users', [], 'get')
    expect(result).toEqual({ rows: [1, 'Alice', 30] })
  })

  it('drizzleQuery executes run methods', async () => {
    const DB = await getDBModule()
    await DB.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, age INTEGER)')
    const result = await DB.__drizzleQuery(
      'INSERT INTO users (name, age) VALUES (?, ?)',
      ['Alice', 30],
      'run'
    )
    expect(result).toEqual({ rows: [] })
    const rows = await DB.all<{ id: number }>('SELECT id FROM users')
    expect(rows).toEqual([{ id: 1 }])
  })
})

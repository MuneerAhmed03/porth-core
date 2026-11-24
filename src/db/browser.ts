import type initSqlJs from 'sql.js'
import type { DrizzleMethod, DrizzleResult, InsertResult, RunResult } from './types'

type SqlJsStatic = initSqlJs.SqlJsStatic
type SqlJsDatabase = initSqlJs.Database
type SqlJsStatement = initSqlJs.Statement
type SqlJsBindParams = initSqlJs.BindParams
type SqlJsConfig = initSqlJs.SqlJsConfig

const SQL_JS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.js'
const SQL_JS_WASM_URL = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.wasm'

type SqlJsInit = (config: SqlJsConfig) => Promise<SqlJsStatic>

declare global {
  var __porthSqlJsInit: SqlJsInit | undefined
}

async function loadSqlJsInit(): Promise<SqlJsInit> {
  if (typeof globalThis.__porthSqlJsInit !== 'undefined') {
    return globalThis.__porthSqlJsInit
  }

  try {
    const module = (await import(/* @vite-ignore */ SQL_JS_URL)) as { default?: unknown }
    const init = module.default
    if (typeof init !== 'function') {
      throw new Error('sql.js initializer not found')
    }
    return init as SqlJsInit
  } catch {
    throw new Error('porth: failed to load sql.js from CDN. Check your internet connection.')
  }
}

export class BrowserDB {
  private dbPromise: Promise<SqlJsDatabase> | null = null

  private getDB(): Promise<SqlJsDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = (async () => {
        const initSqlJs = await loadSqlJsInit()
        const SQL = await initSqlJs({ locateFile: () => SQL_JS_WASM_URL, useOldExtensionFunctions: true })
        return new SQL.Database()
      })()
    }
    return this.dbPromise
  }

  private async withStatement<T>(
    sql: string,
    params: unknown[] | undefined,
    action: (db: SqlJsDatabase, stmt: SqlJsStatement) => T
  ): Promise<T> {
    const db = await this.getDB()
    const stmt = db.prepare(sql)
    try {
      if (params?.length) {
        stmt.bind(params as SqlJsBindParams)
      }
      return action(db, stmt)
    } finally {
      stmt.free()
    }
  }

  all<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
    return this.withStatement(sql, params, (_db, stmt) => {
      const rows: Record<string, unknown>[] = []
      if (stmt.getColumnNames().length > 0) {
        while (stmt.step()) {
          rows.push(stmt.getAsObject())
        }
      } else {
        stmt.step()
      }
      return rows as T[]
    })
  }

  run(sql: string, params?: unknown[]): Promise<RunResult> {
    return this.withStatement(sql, params, (db, stmt) => {
      stmt.step()
      return { changes: db.getRowsModified() }
    })
  }

  insert(sql: string, params?: unknown[]): Promise<InsertResult> {
    return this.withStatement(sql, params, (db, stmt) => {
      stmt.step()
      const changes = db.getRowsModified()
      if (changes === 0) {
        return { changes: 0, lastInsertRowid: 0 }
      }
      const lastInsertRows = db.exec('SELECT last_insert_rowid()')
      const lastInsertRowid = Number(lastInsertRows[0]?.values[0]?.[0] ?? 0)
      return { changes, lastInsertRowid }
    })
  }

  async exec(sql: string, params?: unknown[]): Promise<void> {
    const db = await this.getDB()
    if (params?.length) {
      db.run(sql, params as SqlJsBindParams)
    } else {
      db.exec(sql)
    }
  }

  async drizzleQuery(sql: string, params: unknown[] = [], method: DrizzleMethod): Promise<DrizzleResult> {
    try {
      const db = await this.getDB()

      if (method === 'run') {
        db.run(sql, params as SqlJsBindParams)
        return { rows: [] }
      }

      const results = db.exec(sql, params as SqlJsBindParams)
      const rows = results[0]?.values ?? []
      return method === 'get' ? { rows: rows[0] ?? [] } : { rows }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(message)
    }
  }
}

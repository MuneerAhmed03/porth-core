const SQL_JS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.js'
const SQL_JS_WASM_URL = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.wasm'

interface SqlJsExecResult {
  columns: string[]
  values: unknown[][]
}

interface SqlJsStatement {
  bind(params?: unknown[]): boolean
  step(): boolean
  getAsObject(): Record<string, unknown>
  getColumnNames(): string[]
  free(): void
}

interface SqlJsDatabase {
  exec(sql: string, params?: unknown[]): SqlJsExecResult[]
  run(sql: string, params?: unknown[]): void
  getRowsModified(): number
  prepare(sql: string): SqlJsStatement
}

interface SqlJsStatic {
  Database: new () => SqlJsDatabase
}

type SqlJsInit = (config: { locateFile: (file: string) => string }) => Promise<SqlJsStatic>
type DrizzleMethod = 'run' | 'all' | 'values' | 'get'
type DrizzleResult = { rows: unknown[] }

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
        const SQL = await initSqlJs({ locateFile: () => SQL_JS_WASM_URL })
        return new SQL.Database()
      })()
    }
    return this.dbPromise
  }

  async all<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
    const db = await this.getDB()
    const stmt = db.prepare(sql)
    try {
      if (params?.length) {
        stmt.bind(params)
      }
      const rows: Record<string, unknown>[] = []
      if (stmt.getColumnNames().length > 0) {
        while (stmt.step()) {
          rows.push(stmt.getAsObject())
        }
      } else {
        stmt.step()
      }
      return rows as T[]
    } finally {
      stmt.free()
    }
  }

  async run(sql: string, params?: unknown[]): Promise<{ changes: number }> {
    const db = await this.getDB()
    const stmt = db.prepare(sql)
    try {
      if (params?.length) {
        stmt.bind(params)
      }
      stmt.step()
      return { changes: db.getRowsModified() }
    } finally {
      stmt.free()
    }
  }

  async insert(sql: string, params?: unknown[]): Promise<{ changes: number; lastInsertRowid: number }> {
    const db = await this.getDB()
    const stmt = db.prepare(sql)
    try {
      if (params?.length) {
        stmt.bind(params)
      }
      stmt.step()
      const changes = db.getRowsModified()
      const lastInsertRows = db.exec('SELECT last_insert_rowid()')
      const lastInsertRowid = Number(lastInsertRows[0]?.values[0]?.[0] ?? 0)
      return { changes, lastInsertRowid }
    } finally {
      stmt.free()
    }
  }

  async exec(sql: string, params?: unknown[]): Promise<void> {
    const db = await this.getDB()
    if (params?.length) {
      db.run(sql, params)
    } else {
      db.exec(sql)
    }
  }

  async drizzleQuery(sql: string, params: unknown[] = [], method: DrizzleMethod): Promise<DrizzleResult> {
    try {
      const db = await this.getDB()

      if (method === 'run') {
        db.run(sql, params)
        return { rows: [] }
      }

      const results = db.exec(sql, params)
      const rows = results[0]?.values ?? []
      return method === 'get' ? { rows: rows[0] ?? [] } : { rows }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(message)
    }
  }
}

import { isAndroid } from '../bridge'
import { AndroidDB } from './android'
import { BrowserDB } from './browser'

type DrizzleMethod = 'run' | 'all' | 'values' | 'get'

type DBImpl = {
  all<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>
  run(sql: string, params?: unknown[]): Promise<{ changes: number }>
  insert(sql: string, params?: unknown[]): Promise<{ changes: number; lastInsertRowid: number }>
  exec(sql: string, params?: unknown[]): Promise<void>
  drizzleQuery(sql: string, params: unknown[], method: DrizzleMethod): Promise<{ rows: unknown[] }>
}

const useAndroid = isAndroid()
const impl: DBImpl = useAndroid ? new AndroidDB() : new BrowserDB()

export const DB = {
  all<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
    return impl.all<T>(sql, params)
  },

  run(sql: string, params?: unknown[]): Promise<{ changes: number }> {
    return impl.run(sql, params)
  },

  insert(sql: string, params?: unknown[]): Promise<{ changes: number; lastInsertRowid: number }> {
    return impl.insert(sql, params)
  },

  exec(sql: string, params?: unknown[]): Promise<void> {
    return impl.exec(sql, params)
  },

  /** @internal Used by porth-core/drizzle to satisfy drizzle-orm/sqlite-proxy row-shape requirements. */
  __drizzleQuery(
    sql: string,
    params: unknown[] = [],
    method: DrizzleMethod
  ): Promise<{ rows: unknown[] }> {
    return impl.drizzleQuery(sql, params, method)
  }
}

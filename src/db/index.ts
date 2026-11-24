import { isAndroid } from '../bridge'
import type { DrizzleMethod, DrizzleResult, InsertResult, RunResult } from './types'
import { AndroidDB } from './android'
import { BrowserDB } from './browser'

type DBImpl = {
  all<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>
  run(sql: string, params?: unknown[]): Promise<RunResult>
  insert(sql: string, params?: unknown[]): Promise<InsertResult>
  exec(sql: string, params?: unknown[]): Promise<void>
  drizzleQuery(sql: string, params: unknown[], method: DrizzleMethod): Promise<DrizzleResult>
}

const useAndroid = isAndroid()
const impl: DBImpl = useAndroid ? new AndroidDB() : new BrowserDB()

export const DB = {
  all<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
    return impl.all<T>(sql, params)
  },

  run(sql: string, params?: unknown[]): Promise<RunResult> {
    return impl.run(sql, params)
  },

  insert(sql: string, params?: unknown[]): Promise<InsertResult> {
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
  ): Promise<DrizzleResult> {
    return impl.drizzleQuery(sql, params, method)
  }
}

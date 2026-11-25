import { getBridge } from '../bridge'
import type { DrizzleMethod, DrizzleResult, InsertResult, QueryMode, RunResult } from './types'

type ErrorResponse = { error: string }

function hasErrorField(value: unknown): value is ErrorResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof (value as { error: unknown }).error === 'string'
  )
}

export class AndroidDB {
  private query<T>(sql: string, params: unknown[] | undefined, mode: QueryMode): Promise<T> {
    return Promise.resolve().then(() => {
      const result = getBridge().dbQuery(sql, params ? JSON.stringify(params) : null, mode)
      const parsed = JSON.parse(result) as unknown
      if (hasErrorField(parsed)) {
        throw new Error(parsed.error)
      }
      return parsed as T
    })
  }

  all<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
    return this.query<T[]>(sql, params, 'all')
  }

  run(sql: string, params?: unknown[]): Promise<RunResult> {
    return this.query<{ changes: number }>(sql, params, 'run').then(({ changes }) => ({ changes }))
  }

  insert(sql: string, params?: unknown[]): Promise<InsertResult> {
    return this.query<InsertResult>(sql, params, 'insert')
  }

  exec(sql: string, params?: unknown[]): Promise<void> {
    return this.query<{ changes: number; lastInsertRowid: number }>(sql, params, 'exec').then(
      () => undefined
    )
  }

  async drizzleQuery(sql: string, params: unknown[] = [], method: DrizzleMethod): Promise<DrizzleResult> {
    return Promise.resolve().then(() => {
      const result = getBridge().dbQueryRaw(sql, params.length > 0 ? JSON.stringify(params) : null, method)
      const parsed = JSON.parse(result) as unknown
      if (hasErrorField(parsed)) {
        throw new Error(parsed.error)
      }
      return parsed as DrizzleResult
    })
  }
}

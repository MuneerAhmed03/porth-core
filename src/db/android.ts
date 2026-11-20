import { getBridge } from '../bridge'

type ErrorResponse = { error: string }
type DrizzleMethod = 'run' | 'all' | 'values' | 'get'
type DrizzleResult = { rows: unknown[] }

function hasErrorField(value: unknown): value is ErrorResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof (value as { error: unknown }).error === 'string'
  )
}

export class AndroidDB {
  private query(sql: string, params: unknown[] | undefined, mode: string): Promise<unknown> {
    return Promise.resolve().then(() => {
      const result = getBridge().dbQuery(sql, params ? JSON.stringify(params) : null, mode)
      const parsed = JSON.parse(result) as unknown
      if (hasErrorField(parsed)) {
        throw new Error(parsed.error)
      }
      return parsed
    })
  }

  all<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
    return this.query(sql, params, 'all') as Promise<T[]>
  }

  run(sql: string, params?: unknown[]): Promise<{ changes: number }> {
    return this.query(sql, params, 'run') as Promise<{ changes: number }>
  }

  insert(sql: string, params?: unknown[]): Promise<{ changes: number; lastInsertRowid: number }> {
    return this.query(sql, params, 'insert') as Promise<{ changes: number; lastInsertRowid: number }>
  }

  exec(sql: string, params?: unknown[]): Promise<void> {
    return this.query(sql, params, 'exec').then(() => undefined)
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

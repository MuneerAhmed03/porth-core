export type QueryMode = 'all' | 'run' | 'insert' | 'exec'

export type DrizzleMethod = 'run' | 'all' | 'values' | 'get'

export interface DrizzleResult {
  rows: unknown[]
}

export interface RunResult {
  changes: number
}

export interface InsertResult {
  changes: number
  lastInsertRowid: number
}

# porth-core

Durable local storage and SQLite for Vite apps on the web and Android.

> **Status: pre-alpha.** The API may change before `1.0`.

```bash
npm install porth-core
```

## Key-value storage

```ts
import { Storage } from 'porth-core'

await Storage.set('theme', 'dark')
const theme = await Storage.get<string>('theme')
```

`Storage` uses IndexedDB in the browser and SharedPreferences on Android.

## SQLite

```ts
import { DB } from 'porth-core'

await DB.query(
  'CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY, title TEXT NOT NULL)'
)

await DB.query('INSERT INTO notes (title) VALUES (?)', ['First note'])
const notes = await DB.query<Array<{ id: number; title: string }>>('SELECT * FROM notes')
```

The browser build uses `sql.js`; Android uses the device SQLite through the Porth shell.

## Drizzle

```ts
import { createPorthDrizzle } from 'porth-core/drizzle'
import migrations from './migrations.generated'
import { schema } from './schema'

export const db = createPorthDrizzle({ schema, migrations })
```

Generate and bundle migrations with:

```bash
npx drizzle-kit generate
npx porth-cli drizzle bundle
```

## Browser SQLite status

Browser `DB` is currently in-memory and loads `sql.js` from a CDN. It is useful for development,
but relational data is not persisted across page reloads yet. `Storage` does persist in the browser.

## Links

- CLI and monorepo: <https://github.com/MuneerAhmed03/porth>
- Android shell: <https://github.com/MuneerAhmed03/porth-shell>

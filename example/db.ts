import { createPorthDrizzle } from 'porth/drizzle'
import migrations from './migrations.generated'
import { schema } from './schema'

export const db = createPorthDrizzle({ schema, migrations })

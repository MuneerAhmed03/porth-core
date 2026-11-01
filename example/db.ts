import { createPorthDrizzle } from 'porth-core/drizzle'
import migrations from './migrations.generated'
import { schema } from './schema'

export const db = createPorthDrizzle({ schema, migrations })

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { Migrator, type Migration, type MigrationProvider } from 'kysely'
import { db } from './index.js'

const migrationFolder = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations')

// Loads every file in migrations/ in name order (001, 002, ...).
// pathToFileURL keeps this working on Windows as well as Mac.
const provider: MigrationProvider = {
  async getMigrations() {
    const files = (await fs.readdir(migrationFolder)).filter((f) => f.endsWith('.ts')).sort()
    const migrations: Record<string, Migration> = {}
    for (const file of files) {
      migrations[file.replace(/\.ts$/, '')] = await import(pathToFileURL(path.join(migrationFolder, file)).href)
    }
    return migrations
  },
}

const migrator = new Migrator({ db, provider })

// "npm run migrate" runs everything new; "npm run migrate:down" undoes the last one.
const { error, results } =
  process.argv[2] === 'down' ? await migrator.migrateDown() : await migrator.migrateToLatest()

for (const r of results ?? []) {
  console.log(`${r.status === 'Success' ? 'OK  ' : 'FAIL'} ${r.migrationName} (${r.direction})`)
}
if (error) {
  console.error('Migration failed:', error)
  process.exitCode = 1
}
await db.destroy()
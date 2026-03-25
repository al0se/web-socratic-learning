import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { MongoClient, ObjectId } from 'mongodb'
import { MongoMemoryServer } from 'mongodb-memory-server'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const repoRootDir = path.resolve(rootDir, '..')
const defaultMongoHome = path.join(path.dirname(repoRootDir), 'local-mongo')
const mongoHome = process.env.LOCAL_MONGO_HOME || defaultMongoHome
const dataDir = path.join(mongoHome, 'data')
const legacyDataDir = path.join(rootDir, 'data')

await fs.mkdir(dataDir, { recursive: true })

// Migrate legacy repo-local data directory on first run so MongoDB files live outside the codebase.
const legacyExists = await fs.stat(legacyDataDir).then(() => true).catch(() => false)
const newDataEntries = await fs.readdir(dataDir).catch(() => [])
if (legacyExists && newDataEntries.length === 0) {
  await fs.cp(legacyDataDir, dataDir, { recursive: true })
}

const mongod = await MongoMemoryServer.create({
  instance: {
    ip: '127.0.0.1',
    port: 27017,
    dbName: 'chatgpt',
    dbPath: dataDir,
  },
  binary: {
    version: '7.0.30',
  },
})

console.log(`MongoDB started: ${mongod.getUri()}`)

const client = new MongoClient(mongod.getUri())
await client.connect()

const db = client.db('chatgpt')
await db.collection('user').updateOne(
  { _id: new ObjectId('6406d8c50aedd633885fa16f') },
  {
    $setOnInsert: {
      name: 'Guest',
      email: 'guest@local.dev',
      password: '',
      status: 0,
      createTime: new Date().toLocaleString(),
      verifyTime: new Date().toLocaleString(),
      updateTime: new Date().toLocaleString(),
      roles: [1],
      remark: 'Local anonymous development user',
      useAmount: 999,
      limit_switch: false,
      config: {
        chatModel: 'gpt-5.2',
        maxContextCount: 10,
      },
    },
  },
  { upsert: true },
)

const shutdown = async () => {
  await client.close()
  await mongod.stop()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

process.stdin.resume()

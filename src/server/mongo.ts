import { Db, MongoClient } from 'mongodb'
import { getActiveCompetitionProfile } from '../competitions'
import type { PredictionRecord, StoredUser } from '../types/predictions'

interface StoredUserDocument extends StoredUser {
  _id: string
}

interface PredictionDocument extends PredictionRecord {
  _id: string
}

const databaseUri = process.env.MONGODB_URI
const databaseName = process.env.MONGODB_DB ?? getActiveCompetitionProfile().defaultMongoDbName

let clientPromise: Promise<MongoClient> | null = null
let dbPromise: Promise<Db> | null = null
let indexesPromise: Promise<void> | null = null

const getClient = async () => {
  if (!databaseUri) {
    throw new Error('MongoDB credentials are missing. Configure MONGODB_URI.')
  }

  if (!clientPromise) {
    clientPromise = new MongoClient(databaseUri).connect()
  }

  return await clientPromise
}

const ensureIndexes = async (db: Db) => {
  if (!indexesPromise) {
    const users = db.collection<StoredUserDocument>('users')
    const predictions = db.collection<PredictionDocument>('predictions')

    indexesPromise = Promise.all([
      users.createIndex({ username: 1 }, { unique: true }),
      predictions.createIndex({ userId: 1, matchId: 1 }, { unique: true }),
      predictions.createIndex({ userId: 1 }),
      predictions.createIndex({ matchId: 1 }),
    ]).then(() => undefined)
  }

  await indexesPromise
}

const getDb = async () => {
  if (!dbPromise) {
    dbPromise = getClient().then((client) => client.db(databaseName))
  }

  const db = await dbPromise
  await ensureIndexes(db)
  return db
}

export const getUsersCollection = async () => {
  return (await getDb()).collection<StoredUserDocument>('users')
}

export const getPredictionsCollection = async () => {
  return (await getDb()).collection<PredictionDocument>('predictions')
}
